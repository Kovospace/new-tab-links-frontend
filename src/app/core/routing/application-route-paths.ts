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
 *   <li>{@link purchaseThankYou} — {@code newtablinks.payment.creem.checkout.success-path}</li>
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
  /**
   * Where the payment provider sends a buyer back after paying. Fixed by the backend's
   * {@code newtablinks.payment.creem.checkout.success-path}, which puts it into every checkout
   * it opens. Linked from nowhere else.
   */
  purchaseThankYou: 'thank-you',
  /** Every tip, listed. The extension's "tell me more" links land below it. */
  tips: 'tips',
  /** One tip; the slug is its markdown file's name. */
  tip: 'tips/:slug',
  privacy: 'privacy',
  cookies: 'cookies',
  terms: 'terms',
  refunds: 'refunds',
  /** The fair use policy: the caps behind every "unlimited" the offers promise. */
  fairUse: 'fair-use',
  sitemap: 'sitemap',
  /**
   * The operator's sign-in.
   *
   * <p>Linked from nowhere — not the header, not the footer, not the sitemap. That is not what
   * protects it; the backend's credentials are. There is simply no reason to advertise a door
   * one person is meant to use.</p>
   */
  admin: 'admin',
  /** The operator's account list, behind {@code requiresAdminSession}. */
  adminUsers: 'admin/users',
  /** The operator's usage statistics, behind {@code requiresAdminSession}. */
  adminMetrics: 'admin/metrics',
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
  purchaseThankYou: `/${APPLICATION_ROUTE_PATHS.purchaseThankYou}`,
  tips: `/${APPLICATION_ROUTE_PATHS.tips}`,
  privacy: `/${APPLICATION_ROUTE_PATHS.privacy}`,
  cookies: `/${APPLICATION_ROUTE_PATHS.cookies}`,
  terms: `/${APPLICATION_ROUTE_PATHS.terms}`,
  refunds: `/${APPLICATION_ROUTE_PATHS.refunds}`,
  fairUse: `/${APPLICATION_ROUTE_PATHS.fairUse}`,
  sitemap: `/${APPLICATION_ROUTE_PATHS.sitemap}`,
  admin: `/${APPLICATION_ROUTE_PATHS.admin}`,
  adminUsers: `/${APPLICATION_ROUTE_PATHS.adminUsers}`,
  adminMetrics: `/${APPLICATION_ROUTE_PATHS.adminMetrics}`,
} as const;

/**
 * Query parameters a link may carry into a route.
 *
 * <p>Named here for the same reason as the paths: the page that writes one and the page that
 * reads it must agree on the spelling, and a literal on each side is two places to drift.</p>
 */
export const APPLICATION_ROUTE_QUERY_PARAMETERS = {
  /**
   * On {@link APPLICATION_ROUTE_LINKS.account}: the premium plan to preselect in the purchase
   * form, a {@code PremiumPlan} value. Its presence also asks the page to scroll to the form.
   */
  accountPremiumPlan: 'plan',
} as const;
