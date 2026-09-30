import { InjectionToken } from '@angular/core';

/**
 * Every environment-dependent value this website needs.
 *
 * <p>Resolved at <strong>container start</strong>, not at build time. One image is built once and
 * promoted through every environment; what differs between them arrives as environment variables
 * on the container, which the entrypoint writes into {@code config.json} beside the bundle. See
 * the {@code deployment-pipeline} skill for the whole chain.</p>
 */
export interface RuntimeConfiguration {
  /**
   * Origin of the NewTabLinks backend, without a trailing slash.
   *
   * <p>Set from {@code NEWTABLINKS_BACKEND_BASE_URL}. It reaches the visitor's browser, so it
   * must be an address that browser can resolve — a cluster-internal service name will not do.</p>
   */
  readonly backendBaseUrl: string;

  /**
   * Label this website reports as the device name when it obtains tokens.
   *
   * <p>Set from {@code NEWTABLINKS_WEB_CLIENT_DEVICE_NAME}. Travels in the {@code X-Device-Name}
   * header; the backend never trusts it and only uses it to name a row in the device list.</p>
   */
  readonly webClientDeviceName: string;

  /**
   * Shared key that admits this website to the backend's username-existence endpoint.
   *
   * <p>Set from {@code NEWTABLINKS_FRONTEND_API_KEY}, and must be byte-for-byte the backend's
   * own {@code FRONTEND_API_KEY} or that endpoint refuses every call.</p>
   *
   * <p><strong>This is not a secret and must never be used as one.</strong> It is written into
   * {@code config.json}, which any visitor can fetch, and it travels on a request their browser
   * makes — so it is readable by anyone who looks. It raises the cost of casually scripted
   * username enumeration; it does not prevent it. Nothing that matters may be gated on it.</p>
   *
   * <p>Empty means the registration form simply never runs the check, which is the correct
   * behaviour for {@code ng serve} and for a deployment that has not configured a key.</p>
   */
  readonly frontendApiKey: string;

  /**
   * How long typing has to stop before the registration form looks a username up.
   *
   * <p>Set from {@code NEWTABLINKS_USERNAME_CHECK_DEBOUNCE_MS}. Configurable because it is one
   * half of a pair: the backend refuses two calls made closer together than
   * {@code VISITOR_TOKEN_MINIMUM_REQUEST_INTERVAL}, and this must stay comfortably above that
   * value or real typing is answered with 429. Whoever changes one has to be able to change the
   * other without rebuilding an image.</p>
   *
   * <p>The site does not rely on it for correctness — {@code VisitorTokenService} paces itself
   * against the interval the backend actually reports — but a debounce below the backend's floor
   * turns every keystroke into a wait, which is slower than not debouncing at all.</p>
   */
  readonly usernameCheckDebounceMilliseconds: number;

  /** Where the extension can be installed from. */
  readonly extensionDownload: {
    /**
     * The Chrome Web Store listing.
     *
     * <p>Set from {@code NEWTABLINKS_CHROME_WEB_STORE_URL}. Empty makes the download page show
     * its "not published yet" wording instead of a dead link, which is the current state.</p>
     */
    readonly chromeWebStoreUrl: string;

    /**
     * The packaged extension this site hosts itself.
     *
     * <p>Set from {@code NEWTABLINKS_SELF_HOSTED_CRX_PATH}. Served from {@code public/}, so it is
     * a path on this origin rather than a full URL. Empty disables the offer.</p>
     */
    readonly selfHostedCrxPath: string;
  };
}

/**
 * What the application runs on when nothing overrides it.
 *
 * <p>These are the values for a developer's machine: {@code ng serve} has no {@code config.json}
 * to load and must work anyway. They are also what a test gets, so a spec never has to provide
 * configuration it does not care about.</p>
 */
export const DEFAULT_RUNTIME_CONFIGURATION: RuntimeConfiguration = {
  backendBaseUrl: 'http://localhost:8080',
  webClientDeviceName: 'Tabilinks website',
  frontendApiKey: '',
  usernameCheckDebounceMilliseconds: 250,
  extensionDownload: {
    chromeWebStoreUrl: '',
    selfHostedCrxPath: '/downloads/tabilinks.crx',
  },
};

/**
 * How anything reaches the resolved configuration.
 *
 * <p>Falls back to {@link DEFAULT_RUNTIME_CONFIGURATION} when nothing provides a value, which is
 * what keeps {@code ng serve} and the unit tests working with no extra wiring. The real
 * application overrides it in {@code main.ts} with what was loaded from {@code config.json}.</p>
 */
export const RUNTIME_CONFIGURATION = new InjectionToken<RuntimeConfiguration>(
  'NewTabLinks runtime configuration',
  { providedIn: 'root', factory: () => DEFAULT_RUNTIME_CONFIGURATION },
);
