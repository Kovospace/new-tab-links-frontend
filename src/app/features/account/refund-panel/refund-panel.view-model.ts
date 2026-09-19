import { Injectable, computed, inject, signal } from '@angular/core';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';
import { formatInstantForDisplay } from '../../../shared/formatting/instant-formatter';

/**
 * State and behaviour behind withdrawing from a purchase.
 *
 * <p>This is the buyer exercising the 14-day right of withdrawal, and it exists as a button
 * rather than an email address on purpose. The law wants the declaration to reach the seller; it
 * does not care whether it arrives as a letter or a click, and a click cannot be mistyped, lost
 * in a spam folder or answered three days late. It also leaves a record of exactly when the
 * buyer withdrew, which is the fact anyone would later argue about.</p>
 *
 * <p>Two-step, like deleting an account: the first press only reveals the second. Withdrawing
 * ends the premium access immediately and is not something to hand to a misplaced click — and
 * unlike cancelling, it cannot be undone by simply not cancelling.</p>
 */
@Injectable()
export class RefundPanelViewModel extends AbstractFormViewModel {
  private readonly premiumCheckoutService = inject(PremiumCheckoutService);

  private readonly isConfirming = signal(false);
  private readonly windowClosesAt = signal<string | null>(null);

  /** Whether the confirmation step is showing. */
  readonly isConfirmationRequested = this.isConfirming.asReadonly();

  /**
   * When the refund window closes, spelled out, or empty when the backend did not say.
   *
   * <p>Worth showing rather than leaving the button to stand on its own: a deadline nobody can
   * see is a deadline people discover by missing it, and every one of those becomes a mail
   * asking why the button has gone.</p>
   */
  readonly deadlineSentence = computed<string>(() => {
    const formattedDeadline = formatInstantForDisplay(
      this.windowClosesAt(),
      this.translationService.currentLanguageCode(),
    );

    return formattedDeadline
      ? this.translationService.translate('account.refund.deadline', { date: formattedDeadline })
      : '';
  });

  /**
   * Takes the deadline the account page loaded.
   *
   * @param refundableUntil when the window closes, as the backend reported it
   */
  acceptRefundWindow(refundableUntil: string | null): void {
    this.windowClosesAt.set(refundableUntil);
  }

  /**
   * Reveals the confirmation step.
   */
  requestConfirmation(): void {
    this.isConfirming.set(true);
  }

  /**
   * Hides the confirmation step, leaving the purchase alone.
   */
  cancelConfirmation(): void {
    this.isConfirming.set(false);
  }

  /**
   * Withdraws from the purchase.
   *
   * <p>No reason is asked for, because none may be required — "no reason needed" is the right
   * itself, and a mandatory "why are you leaving?" box would be a condition on exercising it.</p>
   */
  confirmRefund(): void {
    this.beginSubmission();

    this.premiumCheckoutService.requestRefund().subscribe({
      next: () => {
        this.isConfirming.set(false);
        this.completeSubmissionWith('account.refund.success');
      },
      error: (failure: unknown) => this.reportRefundFailure(failure),
    });
  }

  /**
   * Words a failed refund request.
   *
   * @param failure whatever the refund call threw
   */
  private reportRefundFailure(failure: unknown): void {
    if (failure instanceof PaymentGateUnavailableError) {
      this.failSubmissionWith('account.premium.notAvailableYet');
      return;
    }

    this.failSubmission(failure);
  }
}
