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
