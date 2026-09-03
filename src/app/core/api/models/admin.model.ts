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
  readonly failedLoginAttempts: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

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
}

/** An account created by the operator, mirroring {@code AdminUserCreateRequestDto}. */
export interface AdminUserCreation {
  readonly username: string;
  readonly email: string;
  readonly displayName: string;
  /** Omitted for an account that can only sign in through a provider. */
  readonly password?: string;
  readonly status: UserAccountStatus;
}
