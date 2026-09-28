import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '@app/core/billing/premium-checkout.service';
import { PremiumPanelViewModel } from '@app/features/account/premium-panel/premium-panel.view-model';

/**
 * The premium purchase form: which plans it offers, what it sends, and where it sends the browser.
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

  it('sends only the chosen plan', () => {
    beginCheckout.mockReturnValue({ subscribe: () => undefined });

    viewModel.purchaseForm.controls.plan.setValue('LIFETIME');
    viewModel.submitPremiumPurchase();

    expect(beginCheckout).toHaveBeenCalledWith('LIFETIME');
    expect(viewModel.isSubmitting()).toBe(true);
  });

  it('sends the browser to the checkout the backend answered with', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });
    beginCheckout.mockReturnValue(of({ checkoutUrl: 'https://checkout.creem.io/ch_test' }));

    viewModel.submitPremiumPurchase();

    expect(assign).toHaveBeenCalledWith('https://checkout.creem.io/ch_test');
    vi.unstubAllGlobals();
  });

  it('defaults to the renewing plan', () => {
    expect(viewModel.purchaseForm.controls.plan.value).toBe('YEARLY_RECURRING');
  });

  it('says payments are not switched on rather than showing a server error', () => {
    beginCheckout.mockReturnValue(throwError(() => new PaymentGateUnavailableError()));

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
