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
  webClientDeviceName: 'NewTabLinks website',
  extensionDownload: {
    chromeWebStoreUrl: '',
    selfHostedCrxPath: '/downloads/newtablinks.crx',
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
