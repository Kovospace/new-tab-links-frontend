/**
 * A short-lived operator session, mirroring the backend's {@code AdminSessionDto}.
 *
 * <p>One token and no refresh token, deliberately: an admin session is meant to be short, and a
 * long-lived credential for an identity that can delete any account is the one thing that should
 * not exist. When it expires the operator signs in again.</p>
 */
export interface AdminSession {
  /** Bearer token for the endpoints under {@code /api/v1/admin}. */
  readonly accessToken: string;
  /** ISO-8601 instant at which the token stops working. */
  readonly expiresAt: string;
}

/** Lifecycle state of an account, mirroring the backend's {@code UserAccountStatus}. */
export type UserAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'DISABLED';

/** Every status, in the order the operator's dropdown offers them. */
export const USER_ACCOUNT_STATUSES: readonly UserAccountStatus[] = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'DISABLED',
];

/**
 * An account as the operator sees it, mirroring the backend's {@code AdminUserDto}.
 *
 * <p>Wider than {@code UserAccount}, which is what a user sees of themselves: this carries the
 * failed sign-in counter as well. Nobody is shown their own.</p>
 */
export interface AdminUser {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  readonly status: UserAccountStatus;
  readonly hasPassword: boolean;
  /**
   * Whether the account holds the full version.
   *
   * <p>The same flag the account itself carries, and the operator's is the one hand that can set
   * it without a payment. A grant made here is still a real entitlement — it is what honours a
   * support case, and what makes the premium panels testable before any gate exists.</p>
   */
  readonly premium: boolean;
  /** Why the account is premium, or {@code null} when it is not. */
  readonly premiumSource: AdminPremiumSource | null;
  /**
   * When the full version runs out, ISO-8601, while the account holds it.
   *
   * <p>{@code null} when it never runs out — a lifetime purchase or a lifetime grant — and when
   * the account is not premium at all. For a grant, this is what tells a year's grant from a
   * lifetime one.</p>
   */
  readonly premiumUntil: string | null;
  readonly failedLoginAttempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Why an account holds the full version.
 *
 * <p>{@code LIFETIME} and {@code SUBSCRIPTION} were paid for through the payment provider;
 * {@code GRANT} was given by an operator. Only a grant can be taken back from the admin page — a
 * paid entitlement ends through a refund or a cancellation at the provider, never by a checkbox.</p>
 */
export type AdminPremiumSource = 'LIFETIME' | 'SUBSCRIPTION' | 'GRANT';

/**
 * How long an operator's grant lasts, mirroring the backend's {@code PremiumGrantTerm}.
 *
 * <p>{@code ONE_YEAR} runs for a calendar year from the moment it is granted and is never
 * renewed; {@code LIFETIME} has no end. The account page offers the lifetime purchase to the
 * holder of a year's grant, and nothing to the holder of a lifetime one.</p>
 */
export type AdminPremiumGrantTerm = 'ONE_YEAR' | 'LIFETIME';

/** One page of accounts, mirroring the backend's {@code AdminUserPageDto}. */
export interface AdminUserPage {
  readonly users: readonly AdminUser[];
  readonly page: number;
  readonly size: number;
  readonly totalUsers: number;
  readonly totalPages: number;
}

/**
 * The fields an operator may change, mirroring {@code AdminUserUpdateRequestDto}.
 *
 * <p>All three are required because the backend replaces rather than patches — a partial body
 * cannot quietly blank a field. The username is absent because it does not move.</p>
 */
export interface AdminUserUpdate {
  readonly email: string;
  readonly displayName: string;
  readonly status: UserAccountStatus;
  /**
   * Whether the account holds the full version; the operator's grant or revoke.
   *
   * <p>Sent unchanged for an account that paid: the backend refuses to revoke a paid entitlement
   * with a 409, and the edit panel hides the grant choice so it is never asked to.</p>
   */
  readonly premium: boolean;
  /**
   * How long the grant lasts, or {@code null} to leave an existing entitlement as it is.
   *
   * <p>Sent only when the operator changed the grant: the backend re-applies a non-null term to
   * an existing grant, so sending the unchanged term on every save would push a year's grant a
   * year further each time the account's email was corrected. With {@code null}, an account that
   * is not premium yet gets a lifetime grant.</p>
   */
  readonly premiumGrantTerm: AdminPremiumGrantTerm | null;
}

/** An account created by the operator, mirroring {@code AdminUserCreateRequestDto}. */
export interface AdminUserCreation {
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  /** Omitted for an account that can only sign in through a provider. */
  readonly password?: string;
  readonly status: UserAccountStatus;
  /** Whether the new account starts with the full version. */
  readonly premium: boolean;
  /** How long that grant lasts; {@code null} when the account starts free. */
  readonly premiumGrantTerm: AdminPremiumGrantTerm | null;
}
