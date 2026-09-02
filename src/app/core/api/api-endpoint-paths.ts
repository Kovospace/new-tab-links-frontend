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
     * Builds the path that signs one device out.
     *
     * @param deviceId identifier of the device to revoke, as listed by {@code myDevices}
     * @returns the path of that single device
     */
    myDevice: (deviceId: string): string => `/api/v1/users/me/devices/${deviceId}`,
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
