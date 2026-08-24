/**
 * The access and refresh tokens the backend issues, however the client signed in.
 *
 * <p>Mirrors {@code TokenPairDto}. Every sign-in path — password, Google handoff, extension
 * connect code — ends in this same shape, which is why nothing downstream needs to know which
 * path was taken.</p>
 */
export interface TokenPair {
  /** Signed JWT for the {@code Authorization} header; short-lived, roughly fifteen minutes. */
  readonly accessToken: string;
  /** Remaining lifetime of the access token, in seconds. */
  readonly accessTokenExpiresInSeconds: number;
  /** Opaque token used to obtain the next pair; revoked the moment it is used. */
  readonly refreshToken: string;
  /** Identifier of the authenticated user. */
  readonly userId: string;
  /** Name of the authenticated user. */
  readonly username: string;
}
