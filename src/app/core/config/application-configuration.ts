/**
 * Every environment-dependent value the application needs, in one place.
 *
 * <p>Kept as a plain constant rather than Angular's file-replacement mechanism because a single
 * deployment target exists so far. When a second one appears, swap this file through
 * {@code fileReplacements} in {@code angular.json} rather than branching on a runtime flag.</p>
 */
export const APPLICATION_CONFIGURATION = {
  /**
   * Origin of the NewTabLinks backend, without a trailing slash.
   *
   * <p>The backend permits this website as a CORS origin at
   * {@code http://localhost:5173} by default, which is why the dev server is bound to that
   * port in {@code angular.json} instead of Angular's usual 4200.</p>
   */
  backendBaseUrl: 'http://localhost:8080',

  /**
   * Label this website reports as the device name when it obtains tokens.
   *
   * <p>Travels in the {@code X-Device-Name} header. The backend never trusts it — it only names
   * a row in the user's device list, so that a session opened here is distinguishable from one
   * opened by the extension.</p>
   */
  webClientDeviceName: 'NewTabLinks website',

  /**
   * Where the extension can be installed from.
   *
   * <p>Both are placeholders until the store listing exists and a packaged build is published.
   * An empty string makes the download page show its "not available yet" wording instead of a
   * dead link, so neither value may be removed — only replaced.</p>
   */
  extensionDownload: {
    /** TODO: replace with the real Chrome Web Store listing URL once published. */
    chromeWebStoreUrl: '',
    /** Served from this project's {@code public/} folder; TODO: publish the packaged build. */
    selfHostedCrxPath: '/downloads/newtablinks.crx',
  },
} as const;
