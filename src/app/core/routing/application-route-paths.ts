/**
 * Every route of this website, in one place.
 *
 * <p>Templates and view-models link through these constants rather than through literals, so a
 * renamed route is one edit. Three of them are fixed by the backend, which builds the links it
 * mails and the address it redirects a Google sign-in to:</p>
 *
 * <ul>
 *   <li>{@link activateAccount} — {@code newtablinks.web.activation-path}</li>
 *   <li>{@link resetPassword} — {@code newtablinks.web.password-reset-path}</li>
 *   <li>{@link oauthCallback} — {@code newtablinks.web.oauth-callback-path}</li>
 * </ul>
 *
 * <p>Renaming one of those means changing the matching backend property in the same change, or
 * every activation mail already sent stops working.</p>
 */
export const APPLICATION_ROUTE_PATHS = {
  home: '',
  download: 'download',
  register: 'register',
  login: 'login',
  /** Fixed by the backend's {@code newtablinks.web.activation-path}. */
  activateAccount: 'activate',
  /** Fixed by the backend's {@code newtablinks.web.password-reset-path}. */
  resetPassword: 'reset-password',
  /** Fixed by the backend's {@code newtablinks.web.oauth-callback-path}. */
  oauthCallback: 'auth/callback',
  devices: 'devices',
  account: 'account',
  privacy: 'privacy',
  cookies: 'cookies',
  sitemap: 'sitemap',
} as const;

/**
 * The same paths as router links, ready to bind to {@code routerLink}.
 *
 * <p>Absolute, so a link works the same wherever in the tree it is rendered.</p>
 */
export const APPLICATION_ROUTE_LINKS = {
  home: '/',
  download: `/${APPLICATION_ROUTE_PATHS.download}`,
  register: `/${APPLICATION_ROUTE_PATHS.register}`,
  login: `/${APPLICATION_ROUTE_PATHS.login}`,
  resetPassword: `/${APPLICATION_ROUTE_PATHS.resetPassword}`,
  devices: `/${APPLICATION_ROUTE_PATHS.devices}`,
  account: `/${APPLICATION_ROUTE_PATHS.account}`,
  privacy: `/${APPLICATION_ROUTE_PATHS.privacy}`,
  cookies: `/${APPLICATION_ROUTE_PATHS.cookies}`,
  sitemap: `/${APPLICATION_ROUTE_PATHS.sitemap}`,
} as const;
