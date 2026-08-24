import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { UserAccount } from '../../core/api/models/user-account.model';
import { TranslationService } from '../../core/i18n/translation.service';
import { UserAccountService } from '../../core/user/user-account.service';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';

/**
 * The account's read-only facts, already worded and formatted.
 */
export interface PresentedAccountDetails {
  /** Name the user signs in with. */
  readonly username: string;
  /** Address identifying the account. */
  readonly email: string;
  /** Lifecycle state of the account, in words. */
  readonly statusLabel: string;
  /** When the account was created, spelled out in the reader's language. */
  readonly createdAtLabel: string;
}

/**
 * State behind the account page.
 *
 * <p>Owns only what the whole page shares: the account itself and the read-only facts drawn from
 * it. Each editable part of the page — the display name, the password, deleting the account — is
 * its own panel with its own view-model, because they fail, succeed and reset independently and
 * folding them together would produce one class that does four unrelated things.</p>
 */
@Injectable()
export class AccountPageViewModel {
  private readonly userAccountService = inject(UserAccountService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly loadedAccount = signal<UserAccount | null>(null);
  private readonly isLoadingAccount = signal(false);
  private readonly loadFailureMessage = signal('');

  /** Whether the account is being fetched. */
  readonly isLoading = this.isLoadingAccount.asReadonly();

  /** Why the account could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /** Whether there is an account to render at all. */
  readonly hasAccount = computed<boolean>(() => this.loadedAccount() !== null);

  /**
   * Whether the account already has a password.
   *
   * <p>Decides whether the password panel offers "set" or "change": an account created through
   * Google has none, and its owner gives it one without proving an old one.</p>
   */
  readonly hasPassword = computed<boolean>(() => this.loadedAccount()?.hasPassword ?? false);

  /** The display name to seed the profile form with. */
  readonly currentDisplayName = computed<string>(() => this.loadedAccount()?.displayName ?? '');

  /** The read-only facts, ready to render. */
  readonly presentedDetails = computed<PresentedAccountDetails | null>(() => {
    const account = this.loadedAccount();
    if (!account) {
      return null;
    }

    return {
      username: account.username,
      email: account.email,
      statusLabel: this.translationService.translate(`account.status.${account.status}`),
      createdAtLabel: formatInstantForDisplay(
        account.createdAt,
        this.translationService.currentLanguageCode(),
      ),
    };
  });

  /**
   * Fetches the signed-in account.
   */
  loadAccount(): void {
    this.isLoadingAccount.set(true);
    this.loadFailureMessage.set('');

    this.userAccountService.loadMyAccount().subscribe({
      next: (userAccount) => {
        this.loadedAccount.set(userAccount);
        this.isLoadingAccount.set(false);
      },
      error: (failure: unknown) => {
        this.isLoadingAccount.set(false);
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }
}
