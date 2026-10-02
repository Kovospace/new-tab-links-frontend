import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authenticationInterceptor } from './core/auth/authentication.interceptor';
import { RUNTIME_CONFIGURATION, RuntimeConfiguration } from './core/config/runtime-configuration';
import { backendFreePrerenderingInterceptor } from './core/rendering/backend-free-prerendering.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { PageMetadataService } from './core/seo/page-metadata.service';
import { WebsiteVisitReporter } from './core/statistics/website-visit-reporter.service';
import { routes } from './app.routes';

/**
 * How the application is assembled at start-up.
 *
 * <p>A function rather than a constant because the configuration is only known once
 * {@code config.json} has been read, and everything that depends on it has to be built around
 * that value rather than reach for it later.</p>
 *
 * @param runtimeConfiguration the environment-dependent values this instance runs on
 * @returns the providers to bootstrap with
 */
export function buildApplicationConfiguration(
  runtimeConfiguration: RuntimeConfiguration,
): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),

      { provide: RUNTIME_CONFIGURATION, useValue: runtimeConfiguration },

      provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),

      /**
       * {@code fetch} rather than XMLHttpRequest because that is what the build patches to serve
       * the site's own files while it renders public pages. Translations and tips are fetched
       * that way.
       */
      provideHttpClient(
        withFetch(),
        withInterceptors([backendFreePrerenderingInterceptor, authenticationInterceptor]),
      ),

      /**
       * Public pages arrive already rendered (see {@code app.routes.server.ts}). Hydration takes
       * that markup over instead of throwing it away and drawing it again. Event replay keeps a
       * click made before the scripts have loaded.
       */
      provideClientHydration(withEventReplay()),

      /**
       * Loads the reader's language before the first page renders, so that no frame of raw
       * translation keys is ever shown.
       */
      provideAppInitializer(() => inject(TranslationService).loadInitialLanguage()),

      // Titles and describes every page for search engines, following navigation and language.
      provideAppInitializer(() => inject(PageMetadataService).followNavigation()),

      // Counts this page load as a website visit once the visitor behaves like a person.
      provideAppInitializer(() => inject(WebsiteVisitReporter).watchForHumanVisit()),
    ],
  };
}
