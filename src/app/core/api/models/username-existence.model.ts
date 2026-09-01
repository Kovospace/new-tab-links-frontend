/**
 * The backend's answer to "is this username already registered?".
 *
 * <p>Mirrors the backend's own response record. One field on purpose: the registration form asks
 * a yes-or-no question, and anything more would be describing an account that the asker has not
 * proved any right to know about.</p>
 */
export interface UsernameExistence {
  /** Whether an account with the asked-about username already exists. */
  readonly exists: boolean;
}
