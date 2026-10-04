import { describe, expect, it } from 'vitest';
import { NO_SUBSCRIPTION, SubscriptionStatus } from '@app/core/api/models/subscription.model';
import { UserAccount } from '@app/core/api/models/user-account.model';
import {
  listPurchasablePlans,
  parsePremiumPlan,
  resolvePremiumStanding,
} from '@app/core/billing/premium-standing';

/**
 * The premium standing rules that both the home page and the account page offer from.
 */
describe('premium standing', () => {
  const account = (premium: boolean): UserAccount => ({ premium }) as UserAccount;
  const subscription = (plan: SubscriptionStatus['plan']): SubscriptionStatus => ({
    ...NO_SUBSCRIPTION,
    plan,
    state: 'ACTIVE',
  });

  it('knows nothing without an account', () => {
    expect(resolvePremiumStanding(null, subscription('LIFETIME'))).toBe('UNKNOWN');
  });

  it('reads premium from the account flag, not from the subscription', () => {
    expect(resolvePremiumStanding(account(false), subscription('LIFETIME'))).toBe('FREE');
  });

  it('tells a lifetime buyer from a subscriber', () => {
    expect(resolvePremiumStanding(account(true), subscription('LIFETIME'))).toBe('LIFETIME');
    expect(resolvePremiumStanding(account(true), subscription('YEARLY_RECURRING'))).toBe(
      'SUBSCRIBED',
    );
  });

  it("leaves nothing to buy for a lifetime grant, and lifetime for a year's grant", () => {
    const grant = (plan: SubscriptionStatus['plan']): SubscriptionStatus => ({
      ...subscription(plan),
      grantedByOperator: true,
    });
    expect(listPurchasablePlans(resolvePremiumStanding(account(true), grant('LIFETIME')))).toEqual(
      [],
    );
    expect(
      listPurchasablePlans(resolvePremiumStanding(account(true), grant('YEARLY_RECURRING'))),
    ).toEqual(['LIFETIME']);
  });

  it('counts premium with no readable plan as subscribed, so lifetime stays on offer', () => {
    expect(resolvePremiumStanding(account(true), NO_SUBSCRIPTION)).toBe('SUBSCRIBED');
  });

  it('offers a subscriber only lifetime, and a lifetime buyer nothing', () => {
    expect(listPurchasablePlans('FREE')).toEqual(['YEARLY_RECURRING', 'LIFETIME']);
    expect(listPurchasablePlans('SUBSCRIBED')).toEqual(['LIFETIME']);
    expect(listPurchasablePlans('LIFETIME')).toEqual([]);
  });

  it('reads only real plans out of a query parameter', () => {
    expect(parsePremiumPlan('LIFETIME')).toBe('LIFETIME');
    expect(parsePremiumPlan('lifetime')).toBeNull();
    expect(parsePremiumPlan(null)).toBeNull();
  });
});
