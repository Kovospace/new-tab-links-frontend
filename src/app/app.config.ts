import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authenticationInterceptor } from './core/auth/authentication.interceptor';
import { RUNTIME_CONFIGURATION, RuntimeConfiguration } from './core/config/runtime-configuration';
import { TranslationService } from './core/i18n/translation.service';
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

      provideHttpClient(withInterceptors([authenticationInterceptor])),

      /**
       * Loads the reader's language before the first page renders, so that no frame of raw
       * translation keys is ever shown.
       */
      provideAppInitializer(() => inject(TranslationService).loadInitialLanguage()),

      // Counts this page load as a website visit once the visitor behaves like a person.
      provideAppInitializer(() => inject(WebsiteVisitReporter).watchForHumanVisit()),
    ],
  };
}
