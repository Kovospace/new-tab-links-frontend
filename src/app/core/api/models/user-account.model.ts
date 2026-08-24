/**
 * Lifecycle state of an account, as the backend reports it.
 *
 * <p>Mirrors the backend {@code UserAccountStatus} enum. Only {@code ACTIVE} accounts can
 * authenticate, which is what makes email activation mean anything.</p>
 */
export type UserAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'DISABLED';

/**
 * The signed-in user's own account.
 *
 * <p>Mirrors {@code UserDto}.</p>
 */
export interface UserAccount {
  /** Identifier of the user. */
  readonly id: string;
  /** Name the user signs in with; immutable once chosen. */
  readonly username: string;
  /** Address identifying the user; the backend refuses to change it by design. */
  readonly email: string;
  /** Name shown in the interface; the only profile field that can be edited. */
  readonly displayName: string;
  /** Lifecycle state of the account. */
  readonly status: UserAccountStatus;
  /**
   * Whether the account has a password at all.
   *
   * <p>An account created through Google has none, and this flag is what decides whether the
   * account page offers "set a password" or "change your password".</p>
   */
  readonly hasPassword: boolean;
  /** When the account was created, ISO-8601. */
  readonly createdAt: string;
  /** When the account was last changed, ISO-8601. */
  readonly updatedAt: string;
}

/**
 * Body accepted when the signed-in user edits their own profile.
 *
 * <p>Mirrors {@code UserProfileUpdateRequestDto}: the display name is the only editable field.</p>
 */
export interface UserProfileUpdateRequest {
  /** Name shown in the interface; required, at most 120 characters. */
  readonly displayName: string;
}
