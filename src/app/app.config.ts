import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { authenticationInterceptor } from './core/auth/authentication.interceptor';
import { TranslationService } from './core/i18n/translation.service';
import { routes } from './app.routes';

/**
 * How the application is assembled at start-up.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),

    provideHttpClient(withInterceptors([authenticationInterceptor])),

    /**
     * Loads the reader's language before the first page renders, so that no frame of raw
     * translation keys is ever shown.
     */
    provideAppInitializer(() => inject(TranslationService).loadInitialLanguage()),
  ],
};
