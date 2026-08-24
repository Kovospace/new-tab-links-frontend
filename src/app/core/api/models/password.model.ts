/**
 * Body accepted when asking for a password reset link.
 *
 * <p>Mirrors {@code PasswordResetRequestDto}. The backend always answers 202, saying nothing
 * about whether the address belongs to an account.</p>
 */
export interface PasswordResetRequest {
  /** Address to send the link to. */
  readonly email: string;
}

/**
 * Body accepted when setting a new password from a reset link.
 *
 * <p>Mirrors {@code PasswordResetConfirmationDto}.</p>
 */
export interface PasswordResetConfirmation {
  /** The token taken from the reset link's query string. */
  readonly token: string;
  /** The password to set. */
  readonly newPassword: string;
}

/**
 * Body accepted when a signed-in user sets or changes their own password.
 *
 * <p>Mirrors {@code PasswordChangeRequestDto}. "Set" and "change" are the same endpoint:
 * {@link currentPassword} is omitted when the account has no password yet, which is the case for
 * every account created through Google. Either way the backend signs every device out.</p>
 */
export interface PasswordChangeRequest {
  /** The existing password; omitted entirely when the account has none yet. */
  readonly currentPassword?: string;
  /** The password to set. */
  readonly newPassword: string;
}
