/**
 * Which premium plan an account holds, or is buying.
 *
 * <p>{@code YEARLY_RECURRING} renews once a year; {@code LIFETIME} is bought once and never
 * expires. The owner calls the renewing plan the "monthly version", but its billing period is a
 * year — the constant says what it does, and the label the buyer reads is a translation key that
 * can say whatever is wanted.</p>
 */
export type PremiumPlan = 'YEARLY_RECURRING' | 'LIFETIME';

/**
 * Where a subscription stands.
 *
 * <p><strong>Treat this as an open set.</strong> The backend expects to grow members over time —
 * refunded, past-due, within a grace period — so nothing may switch on it exhaustively without a
 * fallback branch. A new value arriving from a newer backend must degrade to "we cannot describe
 * this", never to a blank panel.</p>
 */
export type SubscriptionState =
  /** Nothing was ever bought. Not an error, and not a 404: the normal state of most accounts. */
  | 'NONE'
  /** A checkout was started and the gate has not confirmed payment yet. */
  | 'PENDING_PAYMENT'
  /** Paid and running. */
  | 'ACTIVE'
  /** Cancelled, but paid up until {@link SubscriptionStatus.validUntil}. */
  | 'CANCELLED'
  /** Ran out and was not renewed. */
  | 'EXPIRED'
  /** The gate refused the charge. */
  | 'PAYMENT_FAILED'
  /**
   * Withdrawn within the 14 days and paid back.
   *
   * <p>Not {@code CANCELLED}: cancelled means "paid up until the period end", and a refunded
   * buyer has had their money back, so they are owed nothing further.</p>
   */
  | 'REFUNDED';

/**
 * A checkout that has been started but not settled.
 */
export interface PendingCheckout {
  /** Our identifier for the attempt, which the return page polls on. */
  readonly id: string;
  /** When the attempt was started, ISO-8601. */
  readonly startedAt: string;
}

/**
 * Everything the website is allowed to know about an account's premium standing.
 *
 * <p>Mirrors the response of {@code GET /api/v1/billing/subscription}, which answers 200 for
 * every signed-in account — including one that has never bought anything, which comes back as
 * {@code state: 'NONE'} rather than as a 404. Code the "no subscription" branch against that
 * state, not against an error.</p>
 *
 * <p><strong>Whether the account is premium is deliberately not here.</strong> That flag lives on
 * the account itself, as {@code UserAccount.premium}, so that one fact has one home and reaches
 * the Chrome extension through the sync snapshot without a second call. What this interface adds
 * is the detail behind the flag: which plan, until when, and whether it can be cancelled.</p>
 *
 * <p>The flag is a stored, denormalised cache of what this subscription says — not an independent
 * fact. An account is never premium with no subscription behind it: an operator's manual grant is
 * itself a subscription row, with no payment order behind it. That is deliberate, and it is what
 * makes the flag falsifiable. A flag allowed to be true with nothing behind it has no way to be
 * *wrong*, so the day it disagrees with billing, nothing can say which side is the bug.</p>
 *
 * <p><strong>{@link cancellable} is computed by the backend and must be bound directly.</strong>
 * Never re-derive it from the dates below. Whether a lapsed subscription is still honoured inside
 * a grace period is a server policy this side cannot see, and the browser's clock belongs to the
 * user.</p>
 */
export interface SubscriptionStatus {
  /** Which plan, or {@code null} when nothing was ever bought. */
  readonly plan: PremiumPlan | null;

  /** Where the subscription stands. */
  readonly state: SubscriptionState;

  /** When the subscription began, ISO-8601, or {@code null}. */
  readonly startedAt: string | null;

  /**
   * Paid up to this moment, ISO-8601, and {@code null} for a lifetime purchase.
   *
   * <p>{@code null} rather than a far-future sentinel such as {@code 9999-12-31}. A sentinel date
   * reads as an answer and behaves like one: it sorts, it formats, and it survives a comparison
   * against {@code Date.now()} — so it would end up rendered to a buyer as "your subscription
   * expires in the year 9999", and it would let an expiry check quietly pass for a plan that has
   * no expiry to check. {@code null} forces every caller to notice that lifetime has no end
   * date, which is the fact being modelled. {@link PremiumPlan} is what distinguishes the two
   * plans; this field is not.</p>
   */
  readonly validUntil: string | null;

  /**
   * When the next charge falls due, ISO-8601.
   *
   * <p>Non-null only while a renewing subscription really will be charged again. A cancelled but
   * still-valid subscription has a {@link validUntil} and no {@code renewsAt} — that pair is
   * exactly what "premium until March, will not renew" is rendered from. A lifetime purchase has
   * neither.</p>
   *
   * <p>This is the field an automatic renewal is driven from, whether the charge is triggered by
   * the payment gate's own recurrence or by a scheduled job on the backend. Either way the
   * website only reads it: renewal keeps happening until the subscription is explicitly
   * cancelled, and cancelling is what clears this while leaving {@link validUntil} standing.</p>
   */
  readonly renewsAt: string | null;

  /** When the user cancelled, ISO-8601, or {@code null}. */
  readonly cancelledAt: string | null;

  /** Whether cancelling is offered. Computed by the backend; bind it, do not compute it. */
  readonly cancellable: boolean;

  /**
   * Whether the purchase is still inside the 14-day withdrawal window.
   *
   * <p>Computed by the backend, and bound directly for the same reason as {@link cancellable}:
   * the deadline it encodes is a date comparison, and doing it here would run it against a clock
   * the user owns. Someone whose window closed yesterday could reopen it by setting their system
   * date back.</p>
   *
   * <p>The refund it offers is a full one — the whole amount back, no reason asked, nothing
   * deducted for the days already used. That is deliberately more generous than EU law requires,
   * which is what lets the purchase form skip the consent checkbox a pro-rata charge would have
   * needed.</p>
   */
  readonly refundable: boolean;

  /**
   * When the refund window closes, ISO-8601, or {@code null} when there is none open.
   *
   * <p><strong>Display only.</strong> {@link refundable} decides whether a refund is offered;
   * this is only ever rendered, so the buyer can see the deadline rather than discovering it by
   * missing it. The same relationship as {@link cancellable} and {@link validUntil}: the boolean
   * is the decision, the date is the explanation.</p>
   */
  readonly refundableUntil: string | null;

  /** An unsettled checkout, or {@code null} when there is none. */
  readonly pendingCheckout: PendingCheckout | null;
}

/**
 * What the website sends to start a purchase.
 *
 * <p>Mirrors the body of {@code POST /api/v1/billing/checkouts}. Deliberately the smallest thing
 * that could work: what is being bought, and where the buyer says they are.</p>
 *
 * <p>The country travels as a plain ISO code and nothing more. Which gate the purchase is routed
 * to — GoPay inside the EU, a merchant-of-record provider outside it — is the backend's decision.
 * That is not a detail: the EU list is not really a list of countries but of territories (the
 * Canaries, Åland, Mount Athos, Northern Ireland), and any version of it compiled into a public
 * bundle is a tax bug that ships to every browser and cannot be recalled, because the old bundle
 * stays in caches. It would also be a bug the buyer could edit, which means choosing who carries
 * the tax liability. The website says where the buyer claims to be; the server decides what that
 * claim means.</p>
 *
 * <p>The continent is not sent. It narrows the country dropdown and means nothing beyond that;
 * the backend derives the continent from the country. Two sources for one fact, one of them
 * supplied by the client, is a bug waiting to be written.</p>
 */
export interface PremiumCheckoutRequest {
  /** Which plan is being bought. */
  readonly plan: PremiumPlan;

  /** ISO 3166-1 alpha-2 code of the country the buyer selected, upper case. */
  readonly countryCode: string;
}

/**
 * Where the browser has to go next to pay.
 *
 * <p>Mirrors the 201 response of {@code POST /api/v1/billing/checkouts}. The URL is opaque on
 * purpose: every gate worth using hands back a hosted page of its own, so keeping it opaque means
 * swapping one provider for another changes nothing on this side.</p>
 *
 * <p>It must be reached with a top-level navigation. Fetching it would fail — it is cross-origin
 * and a payment gate sends no CORS headers — and a payment page inside an XHR would be the wrong
 * shape even if it worked.</p>
 */
export interface PremiumCheckoutRedirect {
  /** Our identifier for this attempt; the return page polls on it. */
  readonly checkoutId: string;

  /** Absolute URL of the gate's hosted payment page. */
  readonly redirectUrl: string;

  /** Which provider the buyer is about to see, for the "you will be sent to…" line. */
  readonly provider: string;

  /** When the gate stops accepting this attempt, ISO-8601. */
  readonly expiresAt: string;
}

/**
 * What an account with no subscription looks like.
 *
 * <p>The shape the backend promises to answer with for an account that has never bought
 * anything. It exists here because the endpoint does not, so
 * {@code SubscriptionService} can hand the interface something real to render while the backend
 * catches up — and because it is the fixture every test of the "not premium" branch wants.</p>
 */
export const NO_SUBSCRIPTION: SubscriptionStatus = {
  plan: null,
  state: 'NONE',
  startedAt: null,
  validUntil: null,
  renewsAt: null,
  cancelledAt: null,
  cancellable: false,
  refundable: false,
  refundableUntil: null,
  pendingCheckout: null,
};
