import { CheckoutPlan } from './subscription.model';

/**
 * One plan's price in one currency, as the backend reads it from the payment provider.
 *
 * <p>Mirrors the backend's {@code PremiumOfferDto}. The price is the provider's own, so what the
 * site shows is exactly what the checkout charges.</p>
 */
export interface PremiumOffer {
  /** Which plan this prices. */
  readonly plan: CheckoutPlan;
  /** ISO 4217 code, e.g. {@code EUR}. A string rather than a union: currencies are data. */
  readonly currency: string;
  /** The price in the currency's minor units — cents for EUR and USD. */
  readonly amountMinorUnits: number;
  /** ISO 8601 period a subscription renews after, e.g. {@code P1Y}; {@code null} if paid once. */
  readonly billingPeriod: string | null;
}

/**
 * Every price on sale, and the currency to show a visitor who has not chosen one.
 *
 * <p>Mirrors the backend's {@code PremiumOffersDto}, answered by
 * {@code GET /api/v1/payments/offers} without signing in.</p>
 */
export interface PremiumOffers {
  /** The currency suggested from the visitor's country; always one that has offers, if any do. */
  readonly suggestedCurrency: string;
  /** Every plan in every currency on sale; empty when payments are not configured. */
  readonly offers: readonly PremiumOffer[];
}
