/**
 * Body accepted when signing in with a password.
 *
 * <p>Mirrors {@code LoginRequestDto}. The backend accepts either the username or the email
 * address in the same field, which is why it is not called {@code username}.</p>
 */
export interface LoginRequest {
  /** Username or email address. */
  readonly usernameOrEmail: string;
  /** The password. */
  readonly password: string;
}

/**
 * Body accepted when trading a refresh token for a fresh pair, and when logging out.
 *
 * <p>Mirrors {@code RefreshRequestDto}.</p>
 */
export interface RefreshRequest {
  /** The refresh token previously issued to this client. */
  readonly refreshToken: string;
}

/**
 * Body accepted when exchanging a single-use code for tokens.
 *
 * <p>Mirrors {@code SingleUseCodeRedemptionRequestDto}. Used for the Google sign-in handoff
 * code that lands on this site's OAuth callback route.</p>
 */
export interface SingleUseCodeRedemptionRequest {
  /** The code as received or typed. */
  readonly code: string;
}

/**
 * A connect code for the user to type into the browser extension.
 *
 * <p>Mirrors {@code ExtensionConnectCodeDto}. This is the bridge for an account created through
 * Google: such an account has no password, so the extension's password form could never sign it
 * in. The website mints a code, the user retypes it, and the extension trades it for tokens.</p>
 */
export interface ExtensionConnectCode {
  /** The code to display, for example {@code 4F2K-9QX1}. */
  readonly code: string;
  /** Moment the code stops working, ISO-8601; roughly ten minutes after minting. */
  readonly expiresAt: string;
}
