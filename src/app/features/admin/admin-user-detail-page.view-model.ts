import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminFairUseLimitsService } from '../../core/admin/admin-fair-use-limits.service';
import { AdminUserService } from '../../core/admin/admin-user.service';
import { AdminUser } from '../../core/api/models/admin.model';
import {
  FairUseLimitOverrides,
  PLAN_LIMIT_NAMES,
  PlanLimitName,
  PlanLimits,
  UserFairUseLimits,
} from '../../core/api/models/plan-limits.model';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';
import { wholeNumberValidator } from '../../shared/forms/whole-number.validator';
import { PresentedLimitDecrease, describeLimitDecreases } from './fair-use-limit-decreases';

/** The longest note the backend keeps about why an account's limits were raised. */
export const FAIR_USE_NOTE_MAX_LENGTH = 500;

/** The form's controls: one optional override per limit, and the note. */
type UserFairUseLimitControls = Record<PlanLimitName, FormControl<number | null>> & {
  note: FormControl<string>;
};

/** One row of the limits table, every value finished text. */
export interface PresentedUserLimitRow {
  /** The limit's backend name, which is also its form control's. */
  readonly limitName: PlanLimitName;
  /** The override input's id, which the label points at. */
  readonly inputId: string;
  /** What the limit counts, in words. */
  readonly label: string;
  /** The global Fair Use value, which an override may not go below. */
  readonly globalValue: string;
  /** The smallest override the input accepts: the global value. */
  readonly minimum: number;
  /** What the account is held to as last saved. */
  readonly effectiveValue: string;
}

/** What the confirmation is about to do. */
type PendingChange =
  | {
      readonly kind: 'SAVE';
      readonly overrides: FairUseLimitOverrides;
      readonly note: string | null;
    }
  | { readonly kind: 'REMOVE' };

/**
 * State behind one account's page in the operator's area: who it is, and its raised Fair Use
 * limits.
 *
 * <p><strong>An override only raises.</strong> Each input is empty — the account follows the
 * global value — or a whole number no lower than that global value; the backend refuses anything
 * lower with a 400, and the form refuses it first. There is no expiry; the note records why.</p>
 *
 * <p>A change can still lower what the account is held to — emptying an override, lowering one,
 * removing them all — and for the two histories that deletes the account's entries above the new
 * cap on its next synchronisation. So, as on the global page, anything that lowers an effective
 * value is confirmed first, naming each limit and what it does.</p>
 */
@Injectable()
export class AdminUserDetailPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminUserService = inject(AdminUserService);
  private readonly adminFairUseLimitsService = inject(AdminFairUseLimitsService);

  /** The account the address names. */
  private readonly userId = inject(ActivatedRoute).snapshot.paramMap.get('userId') ?? '';

  private readonly loadedAccount = signal<AdminUser | null>(null);
  private readonly loadedLimits = signal<UserFairUseLimits | null>(null);
  private readonly loadingPage = signal(false);
  private readonly changeAwaitingConfirmation = signal<PendingChange | null>(null);
  private readonly decreasesAwaitingConfirmation = signal<readonly PresentedLimitDecrease[]>([]);

  /** One optional override per limit, and the note. */
  readonly limitsForm: FormGroup<UserFairUseLimitControls> = this.formBuilder.group({
    ...(Object.fromEntries(
      PLAN_LIMIT_NAMES.map((limitName) => [
        limitName,
        this.formBuilder.control<number | null>(null, [wholeNumberValidator]),
      ]),
    ) as Record<PlanLimitName, FormControl<number | null>>),
    note: this.formBuilder.nonNullable.control('', [
      Validators.maxLength(FAIR_USE_NOTE_MAX_LENGTH),
    ]),
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.limitsForm,
    this.translationService,
  );

  /** The longest note the field takes, for its {@code maxlength}. */
  readonly noteMaxLength = FAIR_USE_NOTE_MAX_LENGTH;

  /** Whether the account and its limits are being fetched. */
  readonly isLoading = this.loadingPage.asReadonly();

  /** Whether there is anything to show yet. */
  readonly hasLoaded = computed<boolean>(
    () => this.loadedAccount() !== null && this.loadedLimits() !== null,
  );

  /** The page's heading: the account's username. */
  readonly heading = computed<string>(() =>
    this.translationService.translate('admin.userDetail.heading', {
      username: this.loadedAccount()?.username ?? '',
    }),
  );

  /** Who the account is, in one line: email and display name. */
  readonly accountSummary = computed<string>(() => {
    const account = this.loadedAccount();
    return account === null
      ? ''
      : this.translationService.translate('admin.userDetail.summary', {
          email: account.email,
          displayName: account.displayName,
        });
  });

  /**
   * A warning shown when the account does not hold premium, empty when it does.
   *
   * <p>A free account is held to the free plan's lower numbers for profiles, spaces,
   * installations and both histories, so raising those has no effect until it holds premium.</p>
   */
  readonly freePlanNotice = computed<string>(() => {
    const limits = this.loadedLimits();
    return limits !== null && !limits.premium
      ? this.translationService.translate('admin.userDetail.freePlanNotice')
      : '';
  });

  /** The table of limits: global, override input, effective. */
  readonly limitRows = computed<readonly PresentedUserLimitRow[]>(() => {
    const limits = this.loadedLimits();
    if (limits === null) {
      return [];
    }
    return PLAN_LIMIT_NAMES.map((limitName) => ({
      limitName,
      inputId: `user-fair-use-limit-${limitName}`,
      label: this.translationService.translate(`admin.fairUseLimit.${limitName}`),
      globalValue: String(limits.fairUse[limitName]),
      minimum: limits.fairUse[limitName],
      effectiveValue: String(limits.effective[limitName]),
    }));
  });

  /** Whether the account has any override at all, which is what offers removing them. */
  readonly hasOverrides = computed<boolean>(() => {
    const limits = this.loadedLimits();
    return (
      limits !== null && PLAN_LIMIT_NAMES.some((limitName) => limits.overrides[limitName] !== null)
    );
  });

  /** The lowered limits waiting for the operator's word; empty while nothing is. */
  readonly pendingDecreases = this.decreasesAwaitingConfirmation.asReadonly();

  /** Whether the confirmation is open. */
  readonly isConfirmingDecrease = computed<boolean>(
    () => this.changeAwaitingConfirmation() !== null,
  );

  /** Whether any lowered limit deletes entries, which the confirmation says in so many words. */
  readonly decreaseDeletesData = computed<boolean>(() =>
    this.decreasesAwaitingConfirmation().some((decrease) => decrease.deletesData),
  );

  /** Fetches the account and its limits. */
  load(): void {
    this.loadingPage.set(true);
    forkJoin({
      account: this.adminUserService.loadAccount(this.userId),
      limits: this.adminFairUseLimitsService.loadUserLimits(this.userId),
    }).subscribe({
      next: ({ account, limits }) => {
        this.loadingPage.set(false);
        this.loadedAccount.set(account);
        this.showLimits(limits);
      },
      error: (failure: unknown) => {
        this.loadingPage.set(false);
        this.failSubmission(failure);
      },
    });
  }

  /** Saves the overrides and the note, or opens the confirmation first when that lowers anything. */
  submitOverrides(): void {
    const limits = this.loadedLimits();
    if (limits === null || this.limitsForm.invalid) {
      this.limitsForm.markAllAsTouched();
      return;
    }
    const overrides = this.readOverrides();
    const note = this.limitsForm.controls.note.value.trim();
    this.proceedOrConfirm(
      { kind: 'SAVE', overrides, note: note.length > 0 ? note : null },
      limits,
      applyOverrides(limits.fairUse, overrides),
    );
  }

  /** Removes every override, after a confirmation when that lowers anything. */
  removeOverrides(): void {
    const limits = this.loadedLimits();
    if (limits !== null) {
      this.proceedOrConfirm({ kind: 'REMOVE' }, limits, limits.fairUse);
    }
  }

  /** Carries out the change the operator has just confirmed. */
  confirmDecrease(): void {
    const change = this.changeAwaitingConfirmation();
    this.closeConfirmation();
    if (change !== null) {
      this.carryOut(change);
    }
  }

  /** Closes the confirmation without changing anything; the form keeps what was typed. */
  cancelDecrease(): void {
    this.closeConfirmation();
  }

  /**
   * Carries a change out at once when it lowers nothing, or holds it for confirmation.
   *
   * @param change what to do
   * @param limits the account's limits as last loaded
   * @param intendedEffective what the account would be held to afterwards
   */
  private proceedOrConfirm(
    change: PendingChange,
    limits: UserFairUseLimits,
    intendedEffective: PlanLimits,
  ): void {
    const decreases = describeLimitDecreases(
      limits.effective,
      intendedEffective,
      this.translationService,
    );
    if (decreases.length === 0) {
      this.carryOut(change);
      return;
    }
    this.changeAwaitingConfirmation.set(change);
    this.decreasesAwaitingConfirmation.set(decreases);
  }

  /**
   * Sends a change to the backend.
   *
   * @param change what to do
   */
  private carryOut(change: PendingChange): void {
    if (change.kind === 'SAVE') {
      this.saveOverrides(change.overrides, change.note);
    } else {
      this.deleteOverrides();
    }
  }

  /**
   * Replaces the account's overrides and note.
   *
   * @param overrides every override, {@code null} where the account inherits
   * @param note why, or {@code null}
   */
  private saveOverrides(overrides: FairUseLimitOverrides, note: string | null): void {
    this.beginSubmission();
    this.adminFairUseLimitsService.saveUserLimits(this.userId, { overrides, note }).subscribe({
      next: (savedLimits) => {
        this.showLimits(savedLimits);
        this.completeSubmissionWith('admin.userDetail.saved');
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /** Removes every override, then reads back what the account is held to now. */
  private deleteOverrides(): void {
    this.beginSubmission();
    this.adminFairUseLimitsService.removeUserLimits(this.userId).subscribe({
      next: () => {
        this.adminFairUseLimitsService.loadUserLimits(this.userId).subscribe({
          next: (limits) => {
            this.showLimits(limits);
            this.completeSubmissionWith('admin.userDetail.removed');
          },
          error: (failure: unknown) => this.failSubmission(failure),
        });
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /**
   * Remembers the account's limits, fills the form, and sets each input's minimum to the global
   * value it may not go below.
   *
   * @param limits the account's limits as the backend holds them
   */
  private showLimits(limits: UserFairUseLimits): void {
    this.loadedLimits.set(limits);
    for (const limitName of PLAN_LIMIT_NAMES) {
      this.limitsForm.controls[limitName].setValidators([
        wholeNumberValidator,
        Validators.min(limits.fairUse[limitName]),
      ]);
    }
    this.limitsForm.reset({ ...limits.overrides, note: limits.note ?? '' });
  }

  /**
   * Reads the override inputs; an empty one inherits.
   *
   * @returns every override, {@code null} where the input is empty
   */
  private readOverrides(): FairUseLimitOverrides {
    const typedValues = this.limitsForm.getRawValue();
    return Object.fromEntries(
      PLAN_LIMIT_NAMES.map((limitName) => {
        const typed = typedValues[limitName];
        return [limitName, typed === null ? null : Number(typed)];
      }),
    ) as unknown as FairUseLimitOverrides;
  }

  /** Closes the confirmation and forgets what it would have done. */
  private closeConfirmation(): void {
    this.changeAwaitingConfirmation.set(null);
    this.decreasesAwaitingConfirmation.set([]);
  }
}

/**
 * What an account would be held to with these overrides: each override where there is one, the
 * global value elsewhere.
 *
 * @param globalLimits the global Fair Use values
 * @param overrides the account's overrides
 * @returns the effective limits
 */
function applyOverrides(globalLimits: PlanLimits, overrides: FairUseLimitOverrides): PlanLimits {
  return Object.fromEntries(
    PLAN_LIMIT_NAMES.map((limitName) => [
      limitName,
      overrides[limitName] ?? globalLimits[limitName],
    ]),
  ) as unknown as PlanLimits;
}
