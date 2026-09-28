import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthenticationService } from '../../core/admin/admin-authentication.service';
import { AdminSessionStore } from '../../core/admin/admin-session.store';
import { AdminUserService } from '../../core/admin/admin-user.service';
import {
  AdminPremiumSource,
  AdminUser,
  USER_ACCOUNT_STATUSES,
  UserAccountStatus,
} from '../../core/api/models/admin.model';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';

/** Accounts per page. Enough to scan, few enough to render without thought. */
const PAGE_SIZE = 25;

/**
 * One account as the table renders it.
 *
 * <p>Every value is finished text: the template binds it and does nothing to it. The two derived
 * flags exist because "has failed sign-ins" and "cannot sign in" are judgements about the data,
 * and judgements belong here rather than in a template condition.</p>
 */
export interface PresentedAccount {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserAccountStatus;
  readonly statusLabel: string;
  /** Whether, and why, the account holds the full version, in words. */
  readonly premiumLabel: string;
  readonly createdAt: string;
  readonly failedLoginAttempts: number;
  /** Whether anything has piled up against this account, which is what offers the unlock. */
  readonly hasFailedAttempts: boolean;
  /** Whether the account has no password and can only sign in through a provider. */
  readonly signsInThroughProviderOnly: boolean;
}

/**
 * State and behaviour behind the operator's account list.
 *
 * <p>The whole repair surface in one page: search, edit, unlock, set a password, create, delete.
 * It is deliberately plain — a table and some forms — because the point of this page is to be
 * usable at the moment something has gone wrong, not to be pleasant to browse.</p>
 *
 * <p><strong>Deleting is two steps on purpose.</strong> It is irreversible and takes every
 * environment, group, subgroup and link the account owns with it, so asking for it only arms the
 * button; a second, explicit confirmation performs it. The account's username is shown in the
 * confirmation, because "delete this account" and "delete <em>kovo</em>" are different sentences
 * to somebody about to do it by accident.</p>
 */
@Injectable()
export class AdminUsersPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminUserService = inject(AdminUserService);
  private readonly adminAuthenticationService = inject(AdminAuthenticationService);
  private readonly adminSessionStore = inject(AdminSessionStore);
  private readonly router = inject(Router);

  private readonly loadedAccounts = signal<readonly AdminUser[]>([]);
  private readonly currentPage = signal(0);
  private readonly totalPages = signal(0);
  private readonly totalAccounts = signal(0);
  private readonly loadingAccounts = signal(false);
  private readonly accountBeingEdited = signal<AdminUser | null>(null);
  private readonly accountAwaitingDeletion = signal<AdminUser | null>(null);
  private readonly creatingAccount = signal(false);

  /**
   * Whether the account in the edit panel is premium because it paid.
   *
   * <p>Its premium checkbox is then locked on: taking a paid entitlement away is a refund or a
   * cancellation at the payment provider, and the backend refuses it from here anyway. The panel
   * says so instead of offering a box that could only fail.</p>
   */
  readonly editedAccountHasPaidPremium = computed<boolean>(() =>
    isPaidPremium(this.accountBeingEdited()?.premiumSource ?? null),
  );

  /** The accounts on the current page, ready to render. */
  readonly accounts = computed<readonly PresentedAccount[]>(() =>
    this.loadedAccounts().map((account) => this.presentAccount(account)),
  );

  /** Whether a page is being fetched, which is what shows the waiting state. */
  readonly isLoading = this.loadingAccounts.asReadonly();

  /** Whether the current search found nothing at all. */
  readonly hasNoAccounts = computed(() => !this.isLoading() && this.accounts().length === 0);

  /** Finished text saying which page of how many is shown. */
  readonly pageSummary = computed(() =>
    this.translationService.translate('admin.users.pageSummary', {
      page: this.currentPage() + 1,
      pages: Math.max(1, this.totalPages()),
      total: this.totalAccounts(),
    }),
  );

  /** Whether there is a page before this one. */
  readonly hasPreviousPage = computed(() => this.currentPage() > 0);

  /** Whether there is a page after this one. */
  readonly hasNextPage = computed(() => this.currentPage() + 1 < this.totalPages());

  /** The account currently open in the edit panel, or null when none is. */
  readonly editedAccount = this.accountBeingEdited.asReadonly();

  /** The account a deletion has been asked for but not yet confirmed, or null. */
  readonly accountPendingDeletion = this.accountAwaitingDeletion.asReadonly();

  /** Whether the create panel is open. */
  readonly isCreatingAccount = this.creatingAccount.asReadonly();

  /** Where the operator's statistics page is. */
  readonly statisticsLink = APPLICATION_ROUTE_LINKS.adminMetrics;

  /** Every status the operator may set, for the dropdowns. */
  readonly availableStatuses = USER_ACCOUNT_STATUSES;

  /** When the operator's own session expires, as finished text. */
  readonly sessionExpiryLabel = computed(() => {
    const expiry = this.adminSessionStore.expiresAt();
    return expiry === null
      ? ''
      : formatInstantForDisplay(
          expiry.toISOString(),
          this.translationService.currentLanguageCode(),
        );
  });

  /** The search box. */
  readonly searchForm = this.formBuilder.nonNullable.group({ query: [''] });

  /** The edit panel's form, filled from whichever account is open. */
  readonly editForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.maxLength(120)]],
    status: ['ACTIVE' as UserAccountStatus, [Validators.required]],
    premium: [false],
  });

  /** The password the operator is setting on the edited account, blank to remove it. */
  readonly passwordForm = this.formBuilder.nonNullable.group({
    password: ['', [Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMinimumLength)]],
  });

  /** The create panel's form. */
  readonly createForm = this.formBuilder.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.usernameMinimumLength),
        Validators.pattern(REGISTRATION_FIELD_CONSTRAINTS.usernamePattern),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required]],
    password: ['', [Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMinimumLength)]],
    status: ['ACTIVE' as UserAccountStatus, [Validators.required]],
    premium: [false],
  });

  /** Loads the first page. Called by the page component once it is on screen. */
  loadFirstPage(): void {
    this.currentPage.set(0);
    this.loadCurrentPage();
  }

  /** Runs the search in the box, from the first page. */
  applySearch(): void {
    this.loadFirstPage();
  }

  /** Moves to the previous page. */
  showPreviousPage(): void {
    if (this.hasPreviousPage()) {
      this.currentPage.update((page) => page - 1);
      this.loadCurrentPage();
    }
  }

  /** Moves to the next page. */
  showNextPage(): void {
    if (this.hasNextPage()) {
      this.currentPage.update((page) => page + 1);
      this.loadCurrentPage();
    }
  }

  /**
   * Opens one account in the edit panel, filling the form from it.
   *
   * @param accountId identifier of the account to edit
   */
  editAccount(accountId: string): void {
    const account = this.loadedAccounts().find((candidate) => candidate.id === accountId);
    if (account === undefined) {
      return;
    }

    this.accountBeingEdited.set(account);
    this.creatingAccount.set(false);
    this.editForm.setValue({
      email: account.email,
      displayName: account.displayName,
      status: account.status,
      premium: account.premium,
    });
    this.lockPremiumWhenPaid(account);
    this.passwordForm.reset();
  }

  /**
   * Locks the premium checkbox for an account that paid, and frees it for any other.
   *
   * <p>Through the control rather than a {@code [disabled]} binding, which a reactive form warns
   * about and ignores. A locked box still submits its value — {@code getRawValue} includes it — so
   * a paid account is sent as premium, which the backend treats as "no change".</p>
   *
   * @param account the account just opened for editing
   */
  private lockPremiumWhenPaid(account: AdminUser): void {
    const premiumField = this.editForm.controls.premium;
    if (isPaidPremium(account.premiumSource)) {
      premiumField.disable();
    } else {
      premiumField.enable();
    }
  }

  /** Closes the edit panel without saving. */
  cancelEditing(): void {
    this.accountBeingEdited.set(null);
  }

  /** Saves the edit panel's changes. */
  saveEditedAccount(): void {
    const account = this.accountBeingEdited();
    if (account === null || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();
    this.adminUserService.updateAccount(account.id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.completeSubmissionWith('admin.users.accountSaved');
        this.accountBeingEdited.set(null);
        this.loadCurrentPage();
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /** Sets, or removes, the edited account's password. */
  saveEditedAccountPassword(): void {
    const account = this.accountBeingEdited();
    if (account === null || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();
    this.adminUserService
      .setPassword(account.id, this.passwordForm.getRawValue().password)
      .subscribe({
        next: () => {
          this.completeSubmissionWith('admin.users.passwordSaved');
          this.passwordForm.reset();
          this.loadCurrentPage();
        },
        error: (failure: unknown) => this.failSubmission(failure),
      });
  }

  /**
   * Clears an account's failed sign-in counter.
   *
   * @param accountId identifier of the account to unlock
   */
  unlockAccount(accountId: string): void {
    this.beginSubmission();
    this.adminUserService.unlockAccount(accountId).subscribe({
      next: () => {
        this.completeSubmissionWith('admin.users.accountUnlocked');
        this.loadCurrentPage();
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /**
   * Arms the deletion of one account, without performing it.
   *
   * @param accountId identifier of the account to delete
   */
  requestDeletion(accountId: string): void {
    this.accountAwaitingDeletion.set(
      this.loadedAccounts().find((candidate) => candidate.id === accountId) ?? null,
    );
  }

  /** Abandons a deletion that was asked for but not confirmed. */
  cancelDeletion(): void {
    this.accountAwaitingDeletion.set(null);
  }

  /** Performs the armed deletion. */
  confirmDeletion(): void {
    const account = this.accountAwaitingDeletion();
    if (account === null) {
      return;
    }

    this.beginSubmission();
    this.adminUserService.deleteAccount(account.id).subscribe({
      next: () => {
        this.completeSubmissionWith('admin.users.accountDeleted');
        this.accountAwaitingDeletion.set(null);
        this.accountBeingEdited.set(null);
        this.loadCurrentPage();
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /** Opens the create panel. */
  startCreatingAccount(): void {
    this.creatingAccount.set(true);
    this.accountBeingEdited.set(null);
    this.createForm.reset({ status: 'ACTIVE' });
  }

  /** Closes the create panel without creating anything. */
  cancelCreatingAccount(): void {
    this.creatingAccount.set(false);
  }

  /** Creates the account described by the create panel. */
  submitNewAccount(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const { username, email, displayName, password, status, premium } =
      this.createForm.getRawValue();

    this.beginSubmission();
    this.adminUserService
      .createAccount({
        username,
        email,
        displayName,
        status,
        premium,
        ...(password.length > 0 ? { password } : {}),
      })
      .subscribe({
        next: () => {
          this.completeSubmissionWith('admin.users.accountCreated');
          this.creatingAccount.set(false);
          this.loadFirstPage();
        },
        error: (failure: unknown) => this.failSubmission(failure),
      });
  }

  /** Ends the operator session and returns to the sign-in. */
  signOut(): void {
    this.adminAuthenticationService.signOut();
    void this.router.navigateByUrl(APPLICATION_ROUTE_LINKS.admin);
  }

  /** Fetches the current page of accounts. */
  private loadCurrentPage(): void {
    this.loadingAccounts.set(true);

    this.adminUserService
      .listAccounts(this.searchForm.getRawValue().query.trim(), this.currentPage(), PAGE_SIZE)
      .subscribe({
        next: (accountPage) => {
          this.loadedAccounts.set(accountPage.users);
          this.currentPage.set(accountPage.page);
          this.totalPages.set(accountPage.totalPages);
          this.totalAccounts.set(accountPage.totalUsers);
          this.loadingAccounts.set(false);
        },
        error: (failure: unknown) => {
          this.loadingAccounts.set(false);
          this.failSubmission(failure);
        },
      });
  }

  /**
   * Turns one account into the finished text the table renders.
   *
   * @param account the account as the backend returned it
   * @returns the account, ready to bind
   */
  private presentAccount(account: AdminUser): PresentedAccount {
    return {
      id: account.id,
      username: account.username,
      email: account.email,
      displayName: account.displayName,
      status: account.status,
      statusLabel: this.translationService.translate(`admin.status.${account.status}`),
      premiumLabel: this.translationService.translate(
        account.premium && account.premiumSource
          ? `admin.premium.${account.premiumSource}`
          : 'admin.premium.no',
      ),
      createdAt: formatInstantForDisplay(
        account.createdAt,
        this.translationService.currentLanguageCode(),
      ),
      failedLoginAttempts: account.failedLoginAttempts,
      hasFailedAttempts: account.failedLoginAttempts > 0,
      signsInThroughProviderOnly: !account.hasPassword,
    };
  }
}

/**
 * Whether an entitlement was paid for, rather than granted by an operator.
 *
 * @param premiumSource why the account is premium, or {@code null} when it is not
 * @returns true for a lifetime purchase or a subscription
 */
function isPaidPremium(premiumSource: AdminPremiumSource | null): boolean {
  return premiumSource === 'LIFETIME' || premiumSource === 'SUBSCRIPTION';
}
