import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { buildApplicationConfiguration } from './app.config';
import { DEFAULT_RUNTIME_CONFIGURATION } from './core/config/runtime-configuration';
import { serverRoutes } from './app.routes.server';

/**
 * How the application is assembled when a page is rendered at build time.
 *
 * <p>The browser's configuration, built on the default runtime configuration. There is no
 * {@code config.json} at build time: it is written when the container starts, long after the pages
 * were rendered. Nothing rendered depends on it either. The backend address is only used for
 * calls, and those are not made on the server
 * ({@code backendFreePrerenderingInterceptor}).</p>
 */
const serverOnlyConfiguration: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const serverApplicationConfiguration = mergeApplicationConfig(
  buildApplicationConfiguration(DEFAULT_RUNTIME_CONFIGURATION),
  serverOnlyConfiguration,
);
