import { UserAccount } from '../api/models/user-account.model';
import { PremiumPlan, SubscriptionStatus } from '../api/models/subscription.model';

/**
 * Where a visitor stands with premium, reduced to what an offer has to know.
 *
 * <ul>
 *   <li>{@code UNKNOWN} — nobody is signed in, or the account has not loaded yet. Offers are shown
 *   as they are to any visitor.</li>
 *   <li>{@code FREE} — signed in, and not premium.</li>
 *   <li>{@code SUBSCRIBED} — premium through a renewing subscription.</li>
 *   <li>{@code LIFETIME} — premium for good; there is nothing left to buy.</li>
 * </ul>
 */
export type PremiumStanding = 'UNKNOWN' | 'FREE' | 'SUBSCRIBED' | 'LIFETIME';

/**
 * Works out a visitor's premium standing.
 *
 * <p>Whether the account is premium comes from {@link UserAccount.premium} and nothing else — the
 * one flag that answers that question — never from the subscription's dates. The subscription is
 * read only to tell the two kinds of premium apart. A premium account whose plan is not lifetime
 * counts as subscribed: it can still be upgraded to lifetime, and offering that is the safe
 * mistake.</p>
 *
 * <p>An operator's grant names a plan too — {@code LIFETIME} for a grant without an end,
 * {@code YEARLY_RECURRING} for a year — so a lifetime grant leaves nothing to buy and a year's
 * grant is offered lifetime, exactly as if it had been paid for.</p>
 *
 * @param signedInAccount the signed-in account, or {@code null} when there is none or it has not
 *     loaded yet
 * @param subscription the account's subscription status
 * @returns the standing the offers are decided on
 */
export function resolvePremiumStanding(
  signedInAccount: UserAccount | null,
  subscription: SubscriptionStatus,
): PremiumStanding {
  if (!signedInAccount) {
    return 'UNKNOWN';
  }
  if (!signedInAccount.premium) {
    return 'FREE';
  }
  return subscription.plan === 'LIFETIME' ? 'LIFETIME' : 'SUBSCRIBED';
}

/**
 * The plans an account in the given standing can still buy.
 *
 * <p>A free account can buy either. A subscriber can only move up to lifetime — buying the
 * subscription it already holds would charge it twice. A lifetime account has nothing left.</p>
 *
 * @param premiumStanding where the account stands
 * @returns the purchasable plans, in the order they are offered
 */
export function listPurchasablePlans(premiumStanding: PremiumStanding): readonly PremiumPlan[] {
  switch (premiumStanding) {
    case 'SUBSCRIBED':
      return ['LIFETIME'];
    case 'LIFETIME':
      return [];
    default:
      return ['YEARLY_RECURRING', 'LIFETIME'];
  }
}

/**
 * Reads a plan out of untrusted text, such as a query parameter.
 *
 * @param candidate the text to read
 * @returns the plan it names, or {@code null} when it names none
 */
export function parsePremiumPlan(candidate: string | null | undefined): PremiumPlan | null {
  return candidate === 'YEARLY_RECURRING' || candidate === 'LIFETIME' ? candidate : null;
}
