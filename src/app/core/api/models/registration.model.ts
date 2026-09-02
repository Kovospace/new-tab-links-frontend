/**
 * Body accepted when registering an account with a password.
 *
 * <p>Mirrors {@code RegistrationRequestDto}. The constraints in
 * {@code REGISTRATION_FIELD_CONSTRAINTS} repeat the backend's own validation so the form can
 * refuse obvious mistakes before a round trip; the backend remains the authority.</p>
 */
export interface RegistrationRequest {
  /** Name the user will sign in with. */
  readonly username: string;
  /** Address the activation link is sent to. */
  readonly email: string;
  /** Chosen password. */
  readonly password: string;
  /**
   * The same password typed a second time.
   *
   * <p>Sent, not merely checked here: the backend validates the pair itself, because a client is
   * not a place to enforce a rule and that endpoint is open to any client that ever registers a
   * user.</p>
   */
  readonly passwordConfirmation: string;
  /** Name shown in the interface. */
  readonly displayName: string;
}

/**
 * The uniform answer to a registration attempt.
 *
 * <p>Mirrors {@code RegistrationAcceptedDto}. The wording is deliberately identical whether the
 * account was created or the address was already registered, so that this endpoint cannot be
 * used to discover who has an account — never replace it with wording of our own.</p>
 */
export interface RegistrationAccepted {
  /** Wording to show the user, supplied by the backend. */
  readonly message: string;

  /**
   * Whether the message actually reached the mail relay, where the backend says so.
   *
   * <p>Optional because it is additive: a backend that predates the field, or any response shape
   * without it, leaves it undefined, and that has to read as "nothing to report" rather than as
   * a failure. Only an explicit {@code false} means the message never got out — a blocked
   * outbound SMTP port, a relay refusing it — which is worth saying, because the alternative is
   * someone waiting for an email that was never sent.</p>
   *
   * <p>It says nothing about whose address it is, and must never be made to. Both branches of
   * registration — an account created, an address already registered — send a message, so the
   * value is the same either way; inferring anything else from it would undo the very uniformity
   * {@link message} exists to preserve.</p>
   *
   * <p>Carried by the registration response only. Resending an activation link answers with this
   * same type but does not report delivery, so there it is always undefined.</p>
   */
  readonly emailDelivered?: boolean;
}

/**
 * Validation limits the backend enforces on registration and password fields.
 *
 * <p>Copied from the backend DTO annotations. If the backend loosens or tightens a limit, this
 * is the single place that has to follow.</p>
 */
export const REGISTRATION_FIELD_CONSTRAINTS = {
  usernameMinimumLength: 3,
  usernameMaximumLength: 60,
  /** Letters, digits, dot, underscore and hyphen only. */
  usernamePattern: /^[A-Za-z0-9._-]+$/,
  emailMaximumLength: 320,
  displayNameMaximumLength: 120,
  passwordMinimumLength: 10,
  passwordMaximumLength: 200,
} as const;
