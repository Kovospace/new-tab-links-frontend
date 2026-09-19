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
  /**
   * Whether the account holds the full version right now.
   *
   * <p>The authoritative answer to "is this user premium", and the one thing about billing that
   * lives on the account rather than behind {@code /api/v1/billing/subscription}. Everything else
   * — which plan, until when, whether it renews — is detail that belongs with the subscription;
   * this is the entitlement, and it is what any feature gate should read.</p>
   *
   * <p><strong>Never re-derive this from a date.</strong> Comparing a "subscribed until" value
   * against {@code Date.now()} puts the decision on a clock the user owns, and it cannot see a
   * grace period, a manual grant, or a refund the server has already acted on.</p>
   *
   * <p>It rides along to the Chrome extension for free: the backend embeds this DTO in the sync
   * snapshot as {@code SyncSnapshotDto.owner}, so the extension learns the flag on every pull
   * without a second endpoint. That is a consequence worth knowing rather than a problem — it is
   * exactly what the extension would need to gate a feature of its own.</p>
   */
  readonly premium: boolean;

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
