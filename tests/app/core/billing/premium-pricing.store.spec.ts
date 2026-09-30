import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PremiumOffers } from '@app/core/api/models/premium-offer.model';
import {
  PremiumPricingStore,
  STORED_CURRENCY_KEY,
  monthlyEquivalentMinorUnits,
} from '@app/core/billing/premium-pricing.store';

/**
 * Which currency prices are shown in: the reader's own choice first, then the backend's suggestion
 * from their country, then whatever is on sale — and never one that is not.
 */
describe('PremiumPricingStore', () => {
  let httpTestingController: HttpTestingController;

  const offersInBothCurrencies = (suggestedCurrency: string): PremiumOffers => ({
    suggestedCurrency,
    offers: [
      { plan: 'SUBSCRIPTION', currency: 'EUR', amountMinorUnits: 468, billingPeriod: 'P1Y' },
      { plan: 'LIFETIME', currency: 'EUR', amountMinorUnits: 1499, billingPeriod: null },
      { plan: 'SUBSCRIPTION', currency: 'USD', amountMinorUnits: 588, billingPeriod: 'P1Y' },
      { plan: 'LIFETIME', currency: 'USD', amountMinorUnits: 1599, billingPeriod: null },
    ],
  });

  /** Creates the store and answers its one request for the offers. */
  const createStoreAnswering = (answer: PremiumOffers | 'FAILURE'): PremiumPricingStore => {
    const store = TestBed.inject(PremiumPricingStore);
    const request = httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith('/api/v1/payments/offers'),
    );
    if (answer === 'FAILURE') {
      request.flush('', { status: 502, statusText: 'Bad Gateway' });
    } else {
      request.flush(answer);
    }
    return store;
  };

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it("shows the currency suggested from the visitor's country", () => {
    const store = createStoreAnswering(offersInBothCurrencies('USD'));

    expect(store.offeredCurrencies()).toEqual(['EUR', 'USD']);
    expect(store.selectedCurrency()).toBe('USD');
    expect(store.offerFor('LIFETIME')?.amountMinorUnits).toBe(1599);
    expect(store.offerFor('YEARLY_RECURRING')?.amountMinorUnits).toBe(588);
  });

  it('prefers a remembered choice over the suggestion', () => {
    globalThis.localStorage.setItem(STORED_CURRENCY_KEY, 'EUR');

    const store = createStoreAnswering(offersInBothCurrencies('USD'));

    expect(store.selectedCurrency()).toBe('EUR');
  });

  it('switches every price when the reader chooses, and remembers it', () => {
    const store = createStoreAnswering(offersInBothCurrencies('USD'));

    store.chooseCurrency('EUR');

    expect(store.offerFor('LIFETIME')?.amountMinorUnits).toBe(1499);
    expect(globalThis.localStorage.getItem(STORED_CURRENCY_KEY)).toBe('EUR');
  });

  it('ignores a currency that is not on sale, remembered or chosen', () => {
    globalThis.localStorage.setItem(STORED_CURRENCY_KEY, 'GBP');
    const store = createStoreAnswering(offersInBothCurrencies('EUR'));

    store.chooseCurrency('CZK');

    expect(store.selectedCurrency()).toBe('EUR');
  });

  it('shows no prices at all when the offers cannot be loaded', () => {
    const store = createStoreAnswering('FAILURE');

    expect(store.selectedCurrency()).toBeNull();
    expect(store.offerFor('LIFETIME')).toBeNull();
  });
});

describe('monthlyEquivalentMinorUnits', () => {
  it('spreads a yearly price over twelve months, and has none for a one-off price', () => {
    expect(
      monthlyEquivalentMinorUnits({
        plan: 'SUBSCRIPTION',
        currency: 'EUR',
        amountMinorUnits: 468,
        billingPeriod: 'P1Y',
      }),
    ).toBe(39);
    expect(
      monthlyEquivalentMinorUnits({
        plan: 'LIFETIME',
        currency: 'EUR',
        amountMinorUnits: 1499,
        billingPeriod: null,
      }),
    ).toBeNull();
  });
});
