import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '../../../core/billing/premium-checkout.service';
import { RefundPanelViewModel } from './refund-panel.view-model';

/**
 * Withdrawing from a purchase: the two-step guard, and what the buyer is told afterwards.
 */
describe('RefundPanelViewModel', () => {
  let viewModel: RefundPanelViewModel;
  let requestRefund: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    requestRefund = vi.fn(() => ({ subscribe: () => undefined }));

    TestBed.configureTestingModule({
      providers: [
        RefundPanelViewModel,
        { provide: PremiumCheckoutService, useValue: { requestRefund } },
      ],
    });

    viewModel = TestBed.inject(RefundPanelViewModel);
  });

  it('asks nothing of the gate until the refund is confirmed', () => {
    viewModel.requestConfirmation();

    expect(viewModel.isConfirmationRequested()).toBe(true);
    expect(requestRefund).not.toHaveBeenCalled();
  });

  it('backs out of the confirmation without refunding', () => {
    viewModel.requestConfirmation();
    viewModel.cancelConfirmation();

    expect(viewModel.isConfirmationRequested()).toBe(false);
    expect(requestRefund).not.toHaveBeenCalled();
  });

  it('asks for no reason, because none may be required', () => {
    viewModel.confirmRefund();

    expect(requestRefund).toHaveBeenCalledWith();
  });

  it('closes the confirmation and reports success once the money is on its way', () => {
    requestRefund.mockReturnValue({
      subscribe: ({ next }: { next: () => void }) => next(),
    });

    viewModel.requestConfirmation();
    viewModel.confirmRefund();

    expect(viewModel.isConfirmationRequested()).toBe(false);
    expect(viewModel.submissionSuccess()).toBe('account.refund.success');
    expect(viewModel.isSubmitting()).toBe(false);
  });

  it('says the gate is not built yet rather than showing a backend error', () => {
    requestRefund.mockReturnValue({
      subscribe: ({ error }: { error: (failure: unknown) => void }) =>
        error(new PaymentGateUnavailableError()),
    });

    viewModel.confirmRefund();

    expect(viewModel.submissionFailure()).toBe('account.premium.notAvailableYet');
    expect(viewModel.isSubmitting()).toBe(false);
  });
});
