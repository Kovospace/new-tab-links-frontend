import { Injectable, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { PremiumCheckoutRequest, PremiumPlan } from '../../../core/api/models/subscription.model';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../../shared/forms/form-validation-messages.signal';
import { CONTINENT_CODES, ContinentCode } from '../../../shared/geography/continent';
import {
  PresentedCountry,
  listCountriesForDisplay,
} from '../../../shared/geography/country-name-resolver';

/** A continent as its dropdown entry: the value submitted, and the word read. */
export interface PresentedContinent {
  /** The continent code, which is what the form holds. */
  readonly code: ContinentCode;
  /** The continent's name in the reader's language. */
  readonly label: string;
}

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
 * <p>The form is three questions — which continent, which country, which plan — and a button
 * that hands off to a payment gate. It is separate from the profile panel beside it because it
 * fails, succeeds and resets on its own, and because "edit my display name" and "buy a
 * subscription" have no reason to change together.</p>
 *
 * <p><strong>The country is asked for, not detected.</strong> A dropdown the buyer fills in is
 * honest about being a claim, which is what it is: the backend has to check it against whatever
 * the payment gate verifies about the billing address before it means anything for tax. Guessing
 * from the browser's locale or an IP address would look cleverer and be worth less — a VPN
 * changes the guess, and a buyer who has to correct it starts the purchase annoyed.</p>
 *
 * <p>Which gate the purchase is routed to is deliberately not decided here. See
 * {@link PremiumCheckoutRequest} for why that belongs on the server.</p>
 */
@Injectable()
export class PremiumPanelViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly premiumCheckoutService = inject(PremiumCheckoutService);

  /**
   * The purchase form.
   *
   * <p>The plan starts on the renewing option rather than empty: it is the one most buyers want,
   * and a radio group with nothing selected makes a reader wonder whether they missed a step.
   * Continent and country start empty, because there is no honest default for either.</p>
   *
   * <p>The country starts <em>disabled</em>, and is enabled by
   * {@link followContinentWithTheCountryField} once a continent is chosen. Disabling it through
   * the control rather than through a {@code [disabled]} binding in the template is not a style
   * preference: a reactive form warns about that binding and then ignores it, because the control
   * owns its own enabled state and the template would be asserting a second, silent opinion.</p>
   */
  readonly purchaseForm = this.formBuilder.nonNullable.group({
    continent: ['', Validators.required],
    countryCode: [{ value: '', disabled: true }, Validators.required],
    plan: ['YEARLY_RECURRING' as PremiumPlan, Validators.required],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.purchaseForm,
    this.translationService,
  );

  /** Which continent is currently chosen, as a signal the country list can derive from. */
  private readonly selectedContinent = toSignal(this.purchaseForm.controls.continent.valueChanges, {
    initialValue: '',
  });

  /** The continent dropdown's entries, named in the reader's language. */
  readonly continentOptions = computed<readonly PresentedContinent[]>(() =>
    CONTINENT_CODES.map((code) => ({
      code,
      label: this.translationService.translate(`geography.continent.${code}`),
    })),
  );

  /**
   * The country dropdown's entries for the chosen continent.
   *
   * <p>Empty until a continent is chosen, which is what keeps the second dropdown from offering
   * two hundred countries before the first question is answered. Recomputes when the language
   * changes as well, because the names and their ordering are both language-dependent.</p>
   */
  readonly countryOptions = computed<readonly PresentedCountry[]>(() => {
    const continent = this.selectedContinent();
    if (!continent) {
      return [];
    }

    return listCountriesForDisplay(
      continent as ContinentCode,
      this.translationService.currentLanguageCode(),
    );
  });

  /** Whether a continent has been chosen, which is what enables the country dropdown. */
  readonly hasChosenContinent = computed<boolean>(() => this.countryOptions().length > 0);

  /** The two plan options, worded in the reader's language. */
  readonly planOptions = computed<readonly PresentedPlan[]>(() =>
    (['YEARLY_RECURRING', 'LIFETIME'] as const).map((plan) => ({
      plan,
      label: this.translationService.translate(`account.premium.plan.${plan}.label`),
      description: this.translationService.translate(`account.premium.plan.${plan}.description`),
    })),
  );

  constructor() {
    super();
    this.followContinentWithTheCountryField();
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

    const { countryCode, plan } = this.purchaseForm.getRawValue();
    const checkoutRequest: PremiumCheckoutRequest = { countryCode, plan };

    this.premiumCheckoutService.beginCheckout(checkoutRequest).subscribe({
      next: (redirect) => this.leaveForPaymentGate(redirect.redirectUrl),
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
   * <p>"Not built yet" is told apart from "the gate refused" deliberately. They are the same
   * event to the code and completely different news to the reader, and the first one is the only
   * answer this site can currently give.</p>
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

  /**
   * Keeps the country field in step with the continent above it.
   *
   * <p>Two jobs, and both matter. The chosen country is cleared, because otherwise a country from
   * the previous continent survives in the control while the dropdown no longer offers it — the
   * form would submit a pair that contradicts itself and nothing on screen would say so. And the
   * field is enabled only once a continent is chosen, so the second question cannot be answered
   * before the first.</p>
   */
  private followContinentWithTheCountryField(): void {
    const countryField = this.purchaseForm.controls.countryCode;

    this.purchaseForm.controls.continent.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((continent) => {
        countryField.setValue('');
        if (continent) {
          countryField.enable();
        } else {
          countryField.disable();
        }
      });
  }
}
