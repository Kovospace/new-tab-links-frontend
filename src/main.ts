import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { buildApplicationConfiguration } from './app/app.config';
import { loadRuntimeConfiguration } from './app/core/config/runtime-configuration.loader';

/**
 * Starts the application.
 *
 * <p>The runtime configuration is fetched first and the injector is built around it, so that no
 * service can ever be constructed holding a backend URL that later turns out to be wrong. One
 * image serves every environment; what differs arrives in {@code config.json}.</p>
 */
loadRuntimeConfiguration()
  .then((runtimeConfiguration) =>
    bootstrapApplication(App, buildApplicationConfiguration(runtimeConfiguration)),
  )
  .catch((startupFailure) => console.error(startupFailure));
