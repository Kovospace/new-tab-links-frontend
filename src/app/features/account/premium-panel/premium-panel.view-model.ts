import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PremiumPlan } from '../../../core/api/models/subscription.model';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../../shared/forms/form-validation-messages.signal';

/** A plan as its radio button: the value submitted, and the two lines beside it. */
export interface PresentedPlan {
  /** Which plan this option buys. */
  readonly plan: PremiumPlan;
  /** The plan's name in the reader's language. */
  readonly label: string;
  /** One line saying what the plan means, in the reader's language. */
  readonly description: string;
}

/**
 * State and behaviour behind the premium purchase form.
 *
 * <p>The form is one question — which plan — and a button that hands off to Creem's hosted
 * checkout. It is separate from the profile panel beside it because it fails, succeeds and resets
 * on its own, and because "edit my display name" and "buy a subscription" have no reason to change
 * together.</p>
 *
 * <p><strong>The buyer's country is not asked here.</strong> Creem is the merchant of record: it
 * is the legal seller, it asks for the billing country on its own page, and it decides the
 * currency and the tax from it. A country chosen on this side would be sent nowhere and mean
 * nothing.</p>
 */
@Injectable()
export class PremiumPanelViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly premiumCheckoutService = inject(PremiumCheckoutService);

  /**
   * The purchase form.
   *
   * <p>The plan starts on the renewing option rather than empty: it is the one most buyers want,
   * and a radio group with nothing selected makes a reader wonder whether they missed a step.</p>
   */
  readonly purchaseForm = this.formBuilder.nonNullable.group({
    plan: ['YEARLY_RECURRING' as PremiumPlan, Validators.required],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.purchaseForm,
    this.translationService,
  );

  /**
   * The plans on offer; both until the page says otherwise.
   *
   * <p>Both by default, so the form stands on its own; the account page narrows it to lifetime
   * for a subscriber through {@link offerPlans}.</p>
   */
  private readonly offeredPlans = signal<readonly PremiumPlan[]>(['YEARLY_RECURRING', 'LIFETIME']);

  /** The plan options on offer, worded in the reader's language. */
  readonly planOptions = computed<readonly PresentedPlan[]>(() =>
    this.offeredPlans().map((plan) => ({
      plan,
      label: this.translationService.translate(`account.premium.plan.${plan}.label`),
      description: this.translationService.translate(`account.premium.plan.${plan}.description`),
    })),
  );

  /**
   * What happens to the subscription the reader already holds, or empty when they hold none.
   *
   * <p>Only a subscriber is offered lifetime without the subscription beside it, so that is how
   * this knows. Worth saying before they pay rather than after: the backend cancels the
   * subscription once the lifetime purchase is confirmed, and someone who did not expect it would
   * otherwise go looking for the cancel button — or cancel it themselves, and wonder whether that
   * voided the purchase.</p>
   */
  readonly subscriptionCancellationNotice = computed<string>(() =>
    this.offeredPlans().includes('YEARLY_RECURRING')
      ? ''
      : this.translationService.translate('account.premium.subscriptionEndsWithLifetime'),
  );

  /**
   * Narrows the form to the plans the account can buy, and chooses one of them.
   *
   * <p>The choice is the preselected plan when there is one — a link from the home page's offers
   * says which plan the reader clicked. Otherwise the current choice is kept while it is still on
   * offer, and moved to the first plan offered when it is not: a subscriber must never be left
   * with the subscription they already hold selected and hidden.</p>
   *
   * @param purchasablePlans the plans the account can buy, in the order they are offered
   * @param preselectedPlan the plan to choose, or {@code null} to keep the form's own choice
   */
  offerPlans(purchasablePlans: readonly PremiumPlan[], preselectedPlan: PremiumPlan | null): void {
    this.offeredPlans.set(purchasablePlans);

    const planField = this.purchaseForm.controls.plan;
    const chosenPlan = preselectedPlan ?? planField.value;
    if (purchasablePlans.includes(chosenPlan)) {
      planField.setValue(chosenPlan);
    } else if (purchasablePlans.length > 0) {
      planField.setValue(purchasablePlans[0]);
    }
  }

  /**
   * Hands the purchase off to the payment gate.
   *
   * <p>Nothing is charged here and no card is touched. The gate answers with a hosted page of
   * its own, and the browser is sent to it — which is the whole reason this site never handles a
   * card number.</p>
   */
  submitPremiumPurchase(): void {
    if (this.purchaseForm.invalid) {
      this.purchaseForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.premiumCheckoutService.beginCheckout(this.purchaseForm.getRawValue().plan).subscribe({
      next: (checkoutSession) => this.leaveForPaymentGate(checkoutSession.checkoutUrl),
      error: (failure: unknown) => this.reportCheckoutFailure(failure),
    });
  }

  /**
   * Sends the browser to the gate's hosted payment page.
   *
   * <p>A full navigation rather than a router navigation: the destination belongs to the payment
   * provider, not to this application.</p>
   *
   * @param redirectUrl where the gate wants the buyer
   */
  private leaveForPaymentGate(redirectUrl: string): void {
    window.location.assign(redirectUrl);
  }

  /**
   * Words a failed checkout.
   *
   * <p>"No payment provider configured" is told apart from "the checkout failed" deliberately.
   * They are the same event to the code and completely different news to the reader.</p>
   *
   * @param failure whatever the checkout call threw
   */
  private reportCheckoutFailure(failure: unknown): void {
    if (failure instanceof PaymentGateUnavailableError) {
      this.failSubmissionWith('account.premium.notAvailableYet');
      return;
    }

    this.failSubmission(failure);
  }
}
