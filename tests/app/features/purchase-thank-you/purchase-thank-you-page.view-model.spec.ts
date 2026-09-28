import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationSessionStore } from '@app/core/auth/authentication-session.store';
import { PremiumStanding } from '@app/core/billing/premium-standing';
import { PremiumStandingService } from '@app/core/billing/premium-standing.service';
import {
  CONFIRMATION_POLL_ATTEMPTS,
  CONFIRMATION_POLL_INTERVAL_MILLISECONDS,
  PurchaseThankYouPageViewModel,
} from '@app/features/purchase-thank-you/purchase-thank-you-page.view-model';

/**
 * Waiting for the webhook: the page asks again until the account is premium, and then stops.
 */
describe('PurchaseThankYouPageViewModel', () => {
  const isSignedIn = signal(true);
  let answers: PremiumStanding[];
  let loadPremiumStanding: ReturnType<typeof vi.fn>;
  let viewModel: PurchaseThankYouPageViewModel;

  const waitOneInterval = (): void => {
    vi.advanceTimersByTime(CONFIRMATION_POLL_INTERVAL_MILLISECONDS);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    isSignedIn.set(true);
    answers = [];
    loadPremiumStanding = vi.fn(() => of(answers.shift() ?? 'FREE'));
    TestBed.configureTestingModule({
      providers: [
        PurchaseThankYouPageViewModel,
        { provide: AuthenticationSessionStore, useValue: { isSignedIn } },
        { provide: PremiumStandingService, useValue: { loadPremiumStanding } },
      ],
    });
    viewModel = TestBed.inject(PurchaseThankYouPageViewModel);
  });

  afterEach(() => vi.useRealTimers());

  it('keeps checking while the webhook has not arrived, and stops once it has', () => {
    answers = ['FREE', 'FREE', 'LIFETIME'];
    viewModel.confirmPurchase();
    vi.advanceTimersByTime(0);

    expect(viewModel.confirmation()).toBe('CHECKING');
    expect(viewModel.confirmationMessage()).toBe('purchaseThankYou.confirmation.CHECKING');

    waitOneInterval();
    waitOneInterval();
    expect(viewModel.confirmation()).toBe('CONFIRMED_LIFETIME');
    expect(viewModel.isConfirmed()).toBe(true);

    waitOneInterval();
    waitOneInterval();
    expect(loadPremiumStanding).toHaveBeenCalledTimes(3);
  });

  it('confirms a subscription on the first answer when the webhook was quicker', () => {
    answers = ['SUBSCRIBED'];
    viewModel.confirmPurchase();
    vi.advanceTimersByTime(0);

    expect(viewModel.confirmation()).toBe('CONFIRMED_SUBSCRIPTION');
    expect(loadPremiumStanding).toHaveBeenCalledTimes(1);
  });

  it('stops after the last attempt and says the confirmation is on its way', () => {
    viewModel.confirmPurchase();
    vi.advanceTimersByTime(
      CONFIRMATION_POLL_INTERVAL_MILLISECONDS * (CONFIRMATION_POLL_ATTEMPTS + 2),
    );

    expect(viewModel.confirmation()).toBe('STILL_PENDING');
    expect(viewModel.isConfirmed()).toBe(false);
    expect(loadPremiumStanding).toHaveBeenCalledTimes(CONFIRMATION_POLL_ATTEMPTS);
  });

  it('asks nothing when nobody is signed in, and offers the sign-in', () => {
    isSignedIn.set(false);
    viewModel.confirmPurchase();
    vi.advanceTimersByTime(CONFIRMATION_POLL_INTERVAL_MILLISECONDS * 3);

    expect(viewModel.confirmation()).toBe('SIGNED_OUT');
    expect(loadPremiumStanding).not.toHaveBeenCalled();
  });
});
