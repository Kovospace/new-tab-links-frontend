/**
 * A metered pass the backend issues to an anonymous visitor, mirroring its
 * {@code VisitorTokenDto}.
 *
 * <p>Two endpoints disclose whether a username is registered — the lookup this site makes while
 * someone types, and registration itself, which refuses a taken name with 409 — so the backend
 * meters both. A pass is free to obtain and identifies nobody; what it carries is a budget.</p>
 *
 * <p>The limits travel with the pass so this site can pace itself against the numbers actually
 * configured on the backend, instead of a second copy of them here that would one day disagree.
 * Nothing about them is secret: a limit is not enforced by being unknown.</p>
 */
export interface VisitorToken {
  /** The value to send in the {@code X-Visitor-Token} header. */
  readonly token: string;

  /** ISO-8601 instant at which the pass stops working. */
  readonly expiresAt: string;

  /** How long after issue the first call must wait. */
  readonly minimumFirstUseDelayMilliseconds: number;

  /** Shortest gap the backend allows between two calls made with this pass. */
  readonly minimumRequestIntervalMilliseconds: number;

  /** How many calls this pass may make in total. */
  readonly maximumUses: number;
}
