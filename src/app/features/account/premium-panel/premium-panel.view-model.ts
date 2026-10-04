import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PremiumPlan } from '../../../core/api/models/subscription.model';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { PremiumPricingStore } from '../../../core/billing/premium-pricing.store';
import { formatPrice } from '../../../shared/formatting/price-formatter';
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
  /**
   * What it costs in the selected currency, e.g. {@code €4.68 per year}; empty while the price is
   * not known, so the option never shows an invented one.
   */
  readonly price: string;
}

/**
 * State and behaviour behind the premium purchase form.
 *
 * <p>The form is one question — which plan — and a button that hands off to Creem's hosted
 * checkout. It is separate from the profile panel beside it because it fails, succeeds and resets
 * on its own, and because "edit my display name" and "buy a subscription" have no reason to change
 * together.</p>
 *
 * <p><strong>The currency is chosen here; the country is not.</strong> The currency is the
 * site-wide one from {@link PremiumPricingStore} — suggested from the visitor's country, changeable
 * in the header or right in this form — and it picks which of the provider's products is bought.
 * The billing country, and the tax that follows from it, Creem asks on its own page: it is the
 * merchant of record and the legal seller.</p>
 */
@Injectable()
export class PremiumPanelViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly premiumCheckoutService = inject(PremiumCheckoutService);
  private readonly premiumPricingStore = inject(PremiumPricingStore);

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

  /** Whether what the reader already holds is an operator's grant rather than a subscription. */
  private readonly heldPremiumIsOperatorGrant = signal(false);

  /**
   * Whether the form offers a choice of currency — the same one as the header's, repeated where
   * the buyer is about to pay. Not with a single currency on sale, where there is nothing to pick.
   */
  readonly isCurrencyChoiceOffered = computed<boolean>(
    () => this.premiumPricingStore.offeredCurrencies().length > 1,
  );

  /** The plan options on offer, worded and priced in the reader's language and currency. */
  readonly planOptions = computed<readonly PresentedPlan[]>(() =>
    this.offeredPlans().map((plan) => ({
      plan,
      label: this.translationService.translate(`account.premium.plan.${plan}.label`),
      description: this.translationService.translate(`account.premium.plan.${plan}.description`),
      price: this.presentPrice(plan),
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
   *
   * <p>The holder of an operator's year-long grant is offered lifetime the same way, but has no
   * subscription and nothing to be charged twice for; they are told the grant is replaced.</p>
   */
  readonly subscriptionCancellationNotice = computed<string>(() => {
    if (this.offeredPlans().includes('YEARLY_RECURRING')) {
      return '';
    }
    return this.translationService.translate(
      this.heldPremiumIsOperatorGrant()
        ? 'account.premium.grantReplacedByLifetime'
        : 'account.premium.subscriptionEndsWithLifetime',
    );
  });

  /**
   * Says whether the full version the reader already holds was given by an operator.
   *
   * @param isOperatorGrant {@code true} for a grant, {@code false} for a purchase or nothing
   */
  describeHeldPremium(isOperatorGrant: boolean): void {
    this.heldPremiumIsOperatorGrant.set(isOperatorGrant);
  }

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

    const currency = this.premiumPricingStore.selectedCurrency();
    if (currency === null) {
      this.failSubmissionWith('account.premium.notAvailableYet');
      return;
    }

    this.beginSubmission();

    this.premiumCheckoutService.beginCheckout(this.purchaseForm.getRawValue().plan, currency).subscribe({
      next: (checkoutSession) => this.leaveForPaymentGate(checkoutSession.checkoutUrl),
      error: (failure: unknown) => this.reportCheckoutFailure(failure),
    });
  }

  /**
   * Words what a plan costs in the selected currency.
   *
   * @param plan the plan
   * @returns e.g. {@code €4.68 per year}, or empty while the price is not known
   */
  private presentPrice(plan: PremiumPlan): string {
    const offer = this.premiumPricingStore.offerFor(plan);
    if (!offer) {
      return '';
    }
    return this.translationService.translate(`account.premium.plan.${plan}.price`, {
      price: formatPrice(
        offer.amountMinorUnits,
        offer.currency,
        this.translationService.currentLanguageCode(),
      ),
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
