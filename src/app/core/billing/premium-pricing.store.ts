import { Injectable, computed, inject, signal } from '@angular/core';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { PremiumOffer, PremiumOffers } from '../api/models/premium-offer.model';
import { PremiumPlan } from '../api/models/subscription.model';
import { toCheckoutPlan } from './premium-checkout.service';

/**
 * The {@code localStorage} entry holding the currency the reader chose, as an ISO 4217 code.
 *
 * <p>Written only when the reader picks one. Until then the suggestion follows their country, so
 * a traveller is not pinned to the currency of the first place they happened to open the site.</p>
 */
export const STORED_CURRENCY_KEY = 'newtablinks.currency';

/** Months in each renewal period the payment provider is known to use. */
const MONTHS_IN_BILLING_PERIOD: Readonly<Record<string, number>> = {
  P1M: 1,
  P3M: 3,
  P6M: 6,
  P1Y: 12,
};

/**
 * The prices on sale and the currency they are shown in — one instance for the whole site, so the
 * header's currency picker and every price on the page always agree.
 *
 * <p><strong>Which currencies exist is the backend's answer, not a list here.</strong> The payment
 * provider sells in EUR and USD today and plans national currencies; each one it adds arrives
 * through {@code GET /api/v1/payments/offers} with its prices, and this store offers it without a
 * change.</p>
 *
 * <p>The currency shown is, in order: the one the reader chose, if it is still on sale; the one
 * the backend suggests from their country; the first on sale. The offers are fetched once, when
 * the store is first used; if that fails, the site simply shows no prices rather than wrong
 * ones.</p>
 */
@Injectable({ providedIn: 'root' })
export class PremiumPricingStore {
  private readonly backendApiClient = inject(BackendApiClient);

  /** The offers once they have arrived; {@code null} while they are on their way. */
  private readonly loadedOffers = signal<PremiumOffers | null>(null);

  /** The currency the reader picked, remembered from an earlier visit or {@code null}. */
  private readonly chosenCurrency = signal<string | null>(readStoredCurrency());

  constructor() {
    this.loadOffers();
  }

  /** Every currency something is on sale in, in the order the backend lists them. */
  readonly offeredCurrencies = computed<readonly string[]>(() => [
    ...new Set((this.loadedOffers()?.offers ?? []).map((offer) => offer.currency)),
  ]);

  /** The currency prices are shown and charged in, or {@code null} while nothing is on sale. */
  readonly selectedCurrency = computed<string | null>(() => {
    const offeredCurrencies = this.offeredCurrencies();
    const chosenCurrency = this.chosenCurrency();
    const suggestedCurrency = this.loadedOffers()?.suggestedCurrency ?? null;
    if (chosenCurrency && offeredCurrencies.includes(chosenCurrency)) {
      return chosenCurrency;
    }
    if (suggestedCurrency && offeredCurrencies.includes(suggestedCurrency)) {
      return suggestedCurrency;
    }
    return offeredCurrencies[0] ?? null;
  });

  /**
   * Switches every price on the site to another currency, and remembers the choice.
   *
   * <p>A currency not on sale is ignored, so a stale value can never select nothing.</p>
   *
   * @param currency ISO 4217 code
   */
  chooseCurrency(currency: string): void {
    if (!this.offeredCurrencies().includes(currency)) {
      return;
    }
    this.chosenCurrency.set(currency);
    writeStoredCurrency(currency);
  }

  /**
   * The price of a plan in the selected currency.
   *
   * <p>Reads signals, so a {@code computed} calling it follows both the offers and the currency.</p>
   *
   * @param plan the plan
   * @returns its offer, or {@code null} when it is not on sale in that currency or not known yet
   */
  offerFor(plan: PremiumPlan): PremiumOffer | null {
    const checkoutPlan = toCheckoutPlan(plan);
    const selectedCurrency = this.selectedCurrency();
    return (
      this.loadedOffers()?.offers.find(
        (offer) => offer.plan === checkoutPlan && offer.currency === selectedCurrency,
      ) ?? null
    );
  }

  /** Fetches the offers; a failure leaves the site without prices, never with invented ones. */
  private loadOffers(): void {
    this.backendApiClient
      .get<PremiumOffers>(API_ENDPOINT_PATHS.payments.offers, undefined, {
        withoutAuthorization: true,
      })
      .subscribe({
        next: (offers) => this.loadedOffers.set(offers),
        error: () => this.loadedOffers.set({ suggestedCurrency: '', offers: [] }),
      });
  }
}

/**
 * What a renewing offer costs per month, for a headline like "€0.39 / month".
 *
 * @param offer a subscription's offer
 * @returns the price per month in minor units, rounded to a whole one; {@code null} for a one-off
 *     purchase or a period this does not know
 */
export function monthlyEquivalentMinorUnits(offer: PremiumOffer): number | null {
  const months = offer.billingPeriod ? MONTHS_IN_BILLING_PERIOD[offer.billingPeriod] : undefined;
  return months ? Math.round(offer.amountMinorUnits / months) : null;
}

/**
 * Reads the remembered currency.
 *
 * @returns the stored code, or {@code null} when there is none or storage is unavailable
 */
function readStoredCurrency(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORED_CURRENCY_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * Remembers the chosen currency; storage being unavailable only means it is not remembered.
 *
 * @param currency ISO 4217 code
 */
function writeStoredCurrency(currency: string): void {
  try {
    globalThis.localStorage?.setItem(STORED_CURRENCY_KEY, currency);
  } catch {
    // Private browsing or a full quota: the choice still holds for this visit.
  }
}
