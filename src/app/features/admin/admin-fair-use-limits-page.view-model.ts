import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AdminFairUseLimitsService } from '../../core/admin/admin-fair-use-limits.service';
import {
  PLAN_LIMIT_NAMES,
  PlanLimitName,
  PlanLimits,
} from '../../core/api/models/plan-limits.model';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';
import { wholeNumberValidator } from '../../shared/forms/whole-number.validator';
import { PresentedLimitDecrease, describeLimitDecreases } from './fair-use-limit-decreases';

/** The form's controls: one per limit, empty only while nothing has loaded. */
type FairUseLimitControls = Record<PlanLimitName, FormControl<number | null>>;

/** One input of the form, its label already worded. */
export interface PresentedFairUseLimitField {
  /** The limit's backend name, which is also the form control's. */
  readonly limitName: PlanLimitName;
  /** The input's id, which its label points at. */
  readonly inputId: string;
  /** What the limit counts, in words. */
  readonly label: string;
}

/**
 * State behind the operator's page of global Fair Use limits.
 *
 * <p>The eight numbers every account is held to under the Fair Use Policy — the caps behind
 * premium's "unlimited", and the groups, subgroups and links limits of every plan. They are read
 * and replaced whole: the backend takes all eight or none.</p>
 *
 * <p><strong>A decrease is confirmed before it is sent.</strong> Lowering a limit reaches accounts
 * that already hold more: their spaces, profiles or installations over it stop synchronising, and
 * for the two histories the entries above the new cap are deleted on their next synchronisation
 * and cannot be restored. So a save that lowers anything stops at a confirmation naming each
 * lowered limit and what it does; a save that only raises goes straight through.</p>
 */
@Injectable()
export class AdminFairUseLimitsPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminFairUseLimitsService = inject(AdminFairUseLimitsService);

  /** The limits as last loaded or saved; {@code null} until the backend has answered. */
  private readonly limitsInForce = signal<PlanLimits | null>(null);
  private readonly loadingLimits = signal(false);
  private readonly decreasesAwaitingConfirmation = signal<readonly PresentedLimitDecrease[]>([]);
  /** What the confirmation will send, kept so a later edit of the form cannot slip in. */
  private intendedLimits: PlanLimits | null = null;

  /** The eight inputs, each required and a whole number of at least one. */
  readonly limitsForm: FormGroup<FairUseLimitControls> = this.formBuilder.group(
    Object.fromEntries(
      PLAN_LIMIT_NAMES.map((limitName) => [
        limitName,
        this.formBuilder.control<number | null>(null, [
          Validators.required,
          wholeNumberValidator,
          Validators.min(1),
        ]),
      ]),
    ) as FairUseLimitControls,
  );

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.limitsForm,
    this.translationService,
  );

  /** The inputs, in the order the Fair Use Policy lists the limits. */
  readonly limitFields = computed<readonly PresentedFairUseLimitField[]>(() =>
    PLAN_LIMIT_NAMES.map((limitName) => ({
      limitName,
      inputId: `fair-use-limit-${limitName}`,
      label: this.translationService.translate(`admin.fairUseLimit.${limitName}`),
    })),
  );

  /** Whether the limits are being fetched. */
  readonly isLoading = this.loadingLimits.asReadonly();

  /** Whether there is anything to edit yet. */
  readonly hasLoadedLimits = computed<boolean>(() => this.limitsInForce() !== null);

  /** The lowered limits waiting for the operator's word; empty while nothing is. */
  readonly pendingDecreases = this.decreasesAwaitingConfirmation.asReadonly();

  /** Whether the confirmation is open. */
  readonly isConfirmingDecrease = computed<boolean>(
    () => this.decreasesAwaitingConfirmation().length > 0,
  );

  /** Whether any lowered limit deletes entries, which the confirmation says in so many words. */
  readonly decreaseDeletesData = computed<boolean>(() =>
    this.decreasesAwaitingConfirmation().some((decrease) => decrease.deletesData),
  );

  /** Fetches the limits in force and puts them in the form. */
  loadLimits(): void {
    this.loadingLimits.set(true);
    this.adminFairUseLimitsService.loadGlobalLimits().subscribe({
      next: (limits) => {
        this.loadingLimits.set(false);
        this.showLimits(limits);
      },
      error: (failure: unknown) => {
        this.loadingLimits.set(false);
        this.failSubmission(failure);
      },
    });
  }

  /** Saves the form, or opens the confirmation first when it lowers anything. */
  submitLimits(): void {
    const limitsInForce = this.limitsInForce();
    if (limitsInForce === null || this.limitsForm.invalid) {
      this.limitsForm.markAllAsTouched();
      return;
    }

    const intendedLimits = this.readIntendedLimits();
    const decreases = describeLimitDecreases(
      limitsInForce,
      intendedLimits,
      this.translationService,
    );
    if (decreases.length === 0) {
      this.saveLimits(intendedLimits);
      return;
    }
    this.intendedLimits = intendedLimits;
    this.decreasesAwaitingConfirmation.set(decreases);
  }

  /** Sends the decrease the operator has just confirmed. */
  confirmDecrease(): void {
    const intendedLimits = this.intendedLimits;
    this.closeConfirmation();
    if (intendedLimits !== null) {
      this.saveLimits(intendedLimits);
    }
  }

  /** Closes the confirmation without saving; the form keeps what was typed. */
  cancelDecrease(): void {
    this.closeConfirmation();
  }

  /**
   * Replaces the global limits.
   *
   * @param limits all eight values
   */
  private saveLimits(limits: PlanLimits): void {
    this.beginSubmission();
    this.adminFairUseLimitsService.saveGlobalLimits(limits).subscribe({
      next: (savedLimits) => {
        this.showLimits(savedLimits);
        this.completeSubmissionWith('admin.fairUseLimits.saved');
      },
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /**
   * Remembers the limits in force and fills the form with them.
   *
   * @param limits the values as the backend holds them
   */
  private showLimits(limits: PlanLimits): void {
    this.limitsInForce.set(limits);
    this.limitsForm.reset(limits);
  }

  /**
   * Reads the form as the eight numbers to send; only called once the form is valid.
   *
   * @returns the limits as typed
   */
  private readIntendedLimits(): PlanLimits {
    const typedValues = this.limitsForm.getRawValue();
    return Object.fromEntries(
      PLAN_LIMIT_NAMES.map((limitName) => [limitName, Number(typedValues[limitName])]),
    ) as unknown as PlanLimits;
  }

  /** Closes the confirmation and forgets what it would have sent. */
  private closeConfirmation(): void {
    this.intendedLimits = null;
    this.decreasesAwaitingConfirmation.set([]);
  }
}
