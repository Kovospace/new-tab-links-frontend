import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PremiumCheckoutRequest } from '../../../core/api/models/subscription.model';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { TranslationService } from '../../../core/i18n/translation.service';
import { PremiumPanelViewModel } from './premium-panel.view-model';

/**
 * The premium purchase form's mapping logic: the cascading dropdowns, and what reaches the gate.
 */
describe('PremiumPanelViewModel', () => {
  let viewModel: PremiumPanelViewModel;
  let beginCheckout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    beginCheckout = vi.fn(() => {
      throw new Error('beginCheckout was not stubbed for this test');
    });

    TestBed.configureTestingModule({
      providers: [
        PremiumPanelViewModel,
        { provide: PremiumCheckoutService, useValue: { beginCheckout } },
      ],
    });

    viewModel = TestBed.inject(PremiumPanelViewModel);
  });

  it('offers every continent', () => {
    expect(viewModel.continentOptions().map((continent) => continent.code)).toEqual([
      'AFRICA',
      'ASIA',
      'EUROPE',
      'NORTH_AMERICA',
      'OCEANIA',
      'SOUTH_AMERICA',
    ]);
  });

  it('offers no countries until a continent is chosen', () => {
    expect(viewModel.countryOptions()).toEqual([]);
    expect(viewModel.hasChosenContinent()).toBe(false);
  });

  it('narrows the countries to the chosen continent', () => {
    viewModel.purchaseForm.controls.continent.setValue('EUROPE');

    const offeredCodes = viewModel.countryOptions().map((country) => country.code);

    expect(offeredCodes).toContain('SK');
    expect(offeredCodes).toContain('DE');
    expect(offeredCodes).not.toContain('US');
    expect(viewModel.hasChosenContinent()).toBe(true);
  });

  it('names countries in the active language and orders them by that name', () => {
    TestBed.inject(TranslationService);
    viewModel.purchaseForm.controls.continent.setValue('SOUTH_AMERICA');

    const names = viewModel.countryOptions().map((country) => country.name);

    expect(names).toContain('Brazil');
    expect(names).toEqual([...names].sort(new Intl.Collator('en-GB').compare));
  });

  it('keeps the country field disabled until a continent is chosen', () => {
    expect(viewModel.purchaseForm.controls.countryCode.disabled).toBe(true);

    viewModel.purchaseForm.controls.continent.setValue('ASIA');

    expect(viewModel.purchaseForm.controls.countryCode.disabled).toBe(false);
  });

  it('clears a country that belonged to the previous continent', () => {
    viewModel.purchaseForm.controls.continent.setValue('EUROPE');
    viewModel.purchaseForm.controls.countryCode.setValue('SK');

    viewModel.purchaseForm.controls.continent.setValue('ASIA');

    expect(viewModel.purchaseForm.controls.countryCode.value).toBe('');
  });

  it('refuses to submit an incomplete form and does not reach the gate', () => {
    viewModel.submitPremiumPurchase();

    expect(beginCheckout).not.toHaveBeenCalled();
    expect(viewModel.purchaseForm.controls.countryCode.touched).toBe(true);
  });

  it('sends only the plan and the country, never the continent', () => {
    beginCheckout.mockReturnValue({ subscribe: () => undefined });

    viewModel.purchaseForm.controls.continent.setValue('EUROPE');
    viewModel.purchaseForm.controls.countryCode.setValue('SK');
    viewModel.purchaseForm.controls.plan.setValue('LIFETIME');

    viewModel.submitPremiumPurchase();

    const sentRequest = beginCheckout.mock.calls[0][0] as PremiumCheckoutRequest;
    expect(sentRequest).toEqual({ countryCode: 'SK', plan: 'LIFETIME' });
    expect(Object.keys(sentRequest)).not.toContain('continent');
  });

  it('defaults to the renewing plan', () => {
    expect(viewModel.purchaseForm.controls.plan.value).toBe('YEARLY_RECURRING');
  });

  it('says the gate is not built yet rather than showing a backend error', () => {
    beginCheckout.mockReturnValue({
      subscribe: ({ error }: { error: (failure: unknown) => void }) =>
        error(new PaymentGateUnavailableError()),
    });

    viewModel.purchaseForm.controls.continent.setValue('EUROPE');
    viewModel.purchaseForm.controls.countryCode.setValue('SK');

    viewModel.submitPremiumPurchase();

    expect(viewModel.submissionFailure()).toBe('account.premium.notAvailableYet');
    expect(viewModel.isSubmitting()).toBe(false);
  });
  it('offers a subscriber only lifetime, and moves the choice off the plan they hold', () => {
    viewModel.offerPlans(['LIFETIME'], null);

    expect(viewModel.planOptions().map((option) => option.plan)).toEqual(['LIFETIME']);
    expect(viewModel.purchaseForm.controls.plan.value).toBe('LIFETIME');
  });

  it('tells a subscriber buying lifetime that the subscription will be cancelled', () => {
    expect(viewModel.subscriptionCancellationNotice()).toBe('');

    viewModel.offerPlans(['LIFETIME'], null);

    expect(viewModel.subscriptionCancellationNotice()).toBe(
      'account.premium.subscriptionEndsWithLifetime',
    );
  });

  it('chooses the plan a link preselected', () => {
    viewModel.offerPlans(['YEARLY_RECURRING', 'LIFETIME'], 'LIFETIME');

    expect(viewModel.purchaseForm.controls.plan.value).toBe('LIFETIME');
  });

  it("keeps the reader's own choice when nothing is preselected", () => {
    viewModel.purchaseForm.controls.plan.setValue('LIFETIME');

    viewModel.offerPlans(['YEARLY_RECURRING', 'LIFETIME'], null);

    expect(viewModel.purchaseForm.controls.plan.value).toBe('LIFETIME');
  });
});
