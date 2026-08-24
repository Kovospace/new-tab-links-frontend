import { Routes } from '@angular/router';
import { requiresAnonymousVisitor, requiresSignedInUser } from './core/auth/authentication.guards';
import { APPLICATION_ROUTE_PATHS } from './core/routing/application-route-paths';
import { LegalTextRouteData } from './features/legal/legal-text-page.view-model';

/**
 * Every page of this website.
 *
 * <p>All of them are lazy: each page is its own bundle, fetched when it is first visited, so the
 * home page a first-time visitor lands on carries nothing but itself.</p>
 *
 * <p>Three paths are fixed by the backend, which builds the links it mails and the address it
 * redirects a Google sign-in to. They are listed in {@link APPLICATION_ROUTE_PATHS} with the
 * backend property that pins each one.</p>
 */
export const routes: Routes = [
  {
    path: APPLICATION_ROUTE_PATHS.home,
    loadComponent: () => import('./features/home/home-page').then((module) => module.HomePage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.download,
    loadComponent: () =>
      import('./features/download/download-page').then((module) => module.DownloadPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.register,
    canActivate: [requiresAnonymousVisitor],
    loadComponent: () =>
      import('./features/register/register-page').then((module) => module.RegisterPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.login,
    canActivate: [requiresAnonymousVisitor],
    loadComponent: () => import('./features/login/login-page').then((module) => module.LoginPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.activateAccount,
    loadComponent: () =>
      import('./features/activate-account/activate-account-page').then(
        (module) => module.ActivateAccountPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.resetPassword,
    loadComponent: () =>
      import('./features/reset-password/reset-password-page').then(
        (module) => module.ResetPasswordPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.oauthCallback,
    loadComponent: () =>
      import('./features/oauth-callback/oauth-callback-page').then(
        (module) => module.OauthCallbackPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.devices,
    canActivate: [requiresSignedInUser],
    loadComponent: () =>
      import('./features/devices/devices-page').then((module) => module.DevicesPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.account,
    canActivate: [requiresSignedInUser],
    loadComponent: () =>
      import('./features/account/account-page').then((module) => module.AccountPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.privacy,
    data: {
      headingTranslationKey: 'legal.gdprHeading',
      bodyTranslationKey: 'legal.gdprBody',
    } satisfies LegalTextRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.cookies,
    data: {
      headingTranslationKey: 'legal.cookiesHeading',
      bodyTranslationKey: 'legal.cookiesBody',
    } satisfies LegalTextRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.sitemap,
    loadComponent: () =>
      import('./features/legal/sitemap-page').then((module) => module.SitemapPage),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((module) => module.NotFoundPage),
  },
];
