/**
 * Every backend path this website calls, relative to
 * the runtime configuration's {@code backendBaseUrl}.
 *
 * <p>Collected here so that a backend rename is a one-file change, and so that a reader can see
 * the whole surface this website depends on without opening the backend. Paths not listed here
 * are deliberately not consumed yet — the link/group/environment CRUD and the sync snapshot
 * belong to the extension, not to this portal.</p>
 */
export const API_ENDPOINT_PATHS = {
  /** Registration, sign-in and session lifecycle. */
  auth: {
    register: '/api/v1/auth/register',
    activate: '/api/v1/auth/activate',
    resendActivation: '/api/v1/auth/resend-activation',
    login: '/api/v1/auth/login',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
    sessionHandoff: '/api/v1/auth/session-handoff',
    mintExtensionConnectCode: '/api/v1/auth/extension-connect-codes',

    /**
     * Whether a username is already registered.
     *
     * <p>Public, but gated on the shared frontend API key rather than on a token — see
     * {@code BackendRequestOptions.withFrontendApiKey}. Unlike {@code register}, this endpoint
     * discloses by design whether an account exists; that is what lets the registration form
     * warn while someone is still typing.</p>
     */
    usernameExistence: '/api/v1/auth/username-existence',

    /**
     * Issues the metered pass the two enumerable endpoints ask for.
     *
     * <p>Open and unauthenticated — it has to be, the caller is an anonymous visitor — and never
     * metered itself, or a visitor with no pass could never obtain one. See
     * {@code VisitorTokenService}.</p>
     */
    visitorToken: '/api/v1/auth/visitor-token',
  },

  /** Setting, changing and resetting a password. */
  password: {
    resetRequest: '/api/v1/auth/password/reset-request',
    resetConfirm: '/api/v1/auth/password/reset-confirm',
    change: '/api/v1/auth/password/change',
  },

  /** The signed-in user's own account and the browsers it has been used from. */
  user: {
    myAccount: '/api/v1/users/me',
    myDevices: '/api/v1/users/me/devices',
    /**
     * Builds the path of one device, which {@code DELETE} addresses for both of its two jobs.
     *
     * @param deviceId identifier of the device to act on, as listed by {@code myDevices}
     * @returns the path of that single device
     */
    myDevice: (deviceId: string): string => `/api/v1/users/me/devices/${deviceId}`,

    /**
     * Query parameter deciding which kind of deletion {@code DELETE myDevice} performs.
     *
     * <p>Absent or {@code false} — the default — revokes the device's tokens and keeps the row,
     * because the list is a history of where the account has been used and losing entries from it
     * silently would be worse than keeping a signed-out one. {@code true} additionally deletes the
     * row, which is what the device list's remove button asks for.</p>
     *
     * <p>It is a parameter on the existing {@code DELETE} rather than an endpoint of its own so
     * that the destructive reading has to be asked for explicitly: a bundle that predates this —
     * one still cached in somebody's browser — never sends the flag and therefore keeps getting
     * the sign-out it was written against.</p>
     */
    deleteAndForgetParameter: 'deleteAndForget',
  },

  /** Buying premium. What the payment provider tells the backend arrives by webhook, not here. */
  payments: {
    checkouts: '/api/v1/payments/checkouts',
  },

  /**
   * The operator's own endpoints: sign-in, and repairing accounts.
   *
   * <p>Everything below {@code /api/v1/admin} except the sign-in demands an admin token, which
   * only that sign-in issues. A signed-in user's token cannot reach any of it.</p>
   */
  admin: {
    signIn: '/api/v1/admin/login',
    users: '/api/v1/admin/users',
    /**
     * Builds the path of one account.
     *
     * @param userId identifier of the account
     * @returns the path of that account
     */
    user: (userId: string): string => `/api/v1/admin/users/${userId}`,
    /**
     * Builds the path that clears an account's failed sign-in counter.
     *
     * @param userId identifier of the account
     * @returns the path of that account's unlock action
     */
    unlockUser: (userId: string): string => `/api/v1/admin/users/${userId}/unlock`,
    /**
     * Builds the path that sets an account's password.
     *
     * @param userId identifier of the account
     * @returns the path of that account's password
     */
    userPassword: (userId: string): string => `/api/v1/admin/users/${userId}/password`,
  },

  /**
   * Where the browser is sent to start Google sign-in.
   *
   * <p>A full page navigation, never an {@code XMLHttpRequest}: the flow is a redirect chain
   * through Google and back to this site's OAuth callback route, which no fetch can follow.</p>
   */
  providerSignIn: {
    google: '/oauth2/authorization/google',
  },
} as const;
