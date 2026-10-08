import { DEFAULT_RUNTIME_CONFIGURATION, RuntimeConfiguration } from './runtime-configuration';

/**
 * Name of the file the container's entrypoint writes the configuration into.
 *
 * <p>Relative, so it is fetched from whatever origin and base path the site is served under.</p>
 */
const RUNTIME_CONFIGURATION_FILE = 'config.json';

/**
 * Loads the configuration before Angular starts.
 *
 * <p>Deliberately a plain {@code fetch} rather than an Angular initialiser: the backend base URL
 * has to be known before the first injector is built, so that nothing can be constructed holding
 * a stale one. It runs once, in {@code main.ts}, ahead of {@code bootstrapApplication}.</p>
 *
 * <p>A missing or unreadable file is not an error. {@code ng serve} has no {@code config.json},
 * and the defaults are exactly right for a developer's machine — failing to start would only
 * make local development need a file that says nothing new.</p>
 *
 * <p>Values are merged shallowly over the defaults, so a deployment that only sets the backend
 * URL still gets sensible values for everything else.</p>
 *
 * @returns the configuration this instance of the application should run on
 */
export async function loadRuntimeConfiguration(): Promise<RuntimeConfiguration> {
  try {
    const response = await fetch(RUNTIME_CONFIGURATION_FILE, { cache: 'no-store' });
    if (!response.ok) {
      return DEFAULT_RUNTIME_CONFIGURATION;
    }

    return mergeOverDefaults((await response.json()) as Partial<RuntimeConfiguration>);
  } catch {
    return DEFAULT_RUNTIME_CONFIGURATION;
  }
}

/**
 * Lays the loaded values over the defaults.
 *
 * <p>Nested one level deep, because {@code extensionDownload} is a group: a file that names the
 * group without all of its members must not lose the defaults of the ones it leaves out.</p>
 *
 * @param loadedConfiguration whatever the file contained
 * @returns a complete configuration
 */
function mergeOverDefaults(
  loadedConfiguration: Partial<RuntimeConfiguration>,
): RuntimeConfiguration {
  return {
    ...DEFAULT_RUNTIME_CONFIGURATION,
    ...loadedConfiguration,
    extensionDownload: {
      ...DEFAULT_RUNTIME_CONFIGURATION.extensionDownload,
      ...loadedConfiguration.extensionDownload,
    },
  };
}
