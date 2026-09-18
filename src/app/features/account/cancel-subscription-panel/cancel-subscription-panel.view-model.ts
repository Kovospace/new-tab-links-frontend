import { Injectable, inject } from '@angular/core';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';

/**
 * State and behaviour behind cancelling a renewing subscription.
 *
 * <p>Its own view-model rather than a second responsibility on the premium panel's, because the
 * two never appear together — one is for an account that has not bought anything, the other for
 * one that has — and because sharing the "in flight / failed / succeeded" signals would let a
 * failed cancellation surface under a purchase form.</p>
 *
 * <p>It extends the form view-model despite having no form. What it wants from that base class is
 * the outcome half: whether a call is in flight, and what to tell the user when it comes back.
 * A button that calls the backend has exactly the same four states a form does.</p>
 */
@Injectable()
export class CancelSubscriptionPanelViewModel extends AbstractFormViewModel {
  private readonly premiumCheckoutService = inject(PremiumCheckoutService);

  /**
   * Stops the subscription from renewing.
   *
   * <p>Not a refund and not a deletion: the account stays premium until the period already paid
   * for runs out. The panel says so beforehand, because "cancel" reads as "end it now" to plenty
   * of people and the surprise would arrive as a support mail.</p>
   */
  submitCancellation(): void {
    this.beginSubmission();

    this.premiumCheckoutService.cancelSubscription().subscribe({
      next: () => this.completeSubmissionWith('account.cancelSubscription.success'),
      error: (failure: unknown) => this.reportCancellationFailure(failure),
    });
  }

  /**
   * Words a failed cancellation.
   *
   * @param failure whatever the cancellation call threw
   */
  private reportCancellationFailure(failure: unknown): void {
    if (failure instanceof PaymentGateUnavailableError) {
      this.failSubmissionWith('account.premium.notAvailableYet');
      return;
    }

    this.failSubmission(failure);
  }
}
