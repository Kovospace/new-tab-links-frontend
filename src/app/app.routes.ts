import { Route, Routes } from '@angular/router';
import { requiresAdminSession } from './core/admin/admin.guard';
import { requiresAnonymousVisitor, requiresSignedInUser } from './core/auth/authentication.guards';
import {
  AddressLanguageRouteData,
  followAddressLanguage,
} from './core/i18n/address-language.guard';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  SupportedLanguageCode,
} from './core/i18n/supported-language';
import { APPLICATION_ROUTE_PATHS } from './core/routing/application-route-paths';
import { PageMetadataRouteData, pageMetadataFor } from './core/seo/page-metadata';
import { LegalTextRouteData } from './features/legal/legal-text-page.view-model';

/**
 * The public pages: the ones search engines index, and the ones that have an address per language.
 *
 * <p>The same list as {@code core/seo/public-site.json}, which the sitemap is written from. A spec
 * holds the two together.</p>
 */
const LOCALIZED_PAGE_ROUTES: Routes = [
  {
    path: APPLICATION_ROUTE_PATHS.home,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.home, 'seo.home'),
    loadComponent: () => import('./features/home/home-page').then((module) => module.HomePage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.download,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.download, 'seo.download'),
    loadComponent: () =>
      import('./features/download/download-page').then((module) => module.DownloadPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.tips,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.tips, 'seo.tips'),
    loadComponent: () => import('./features/tips/tips-page').then((module) => module.TipsPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.tip,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.tip, 'seo.tip'),
    loadComponent: () => import('./features/tips/tip-page').then((module) => module.TipPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.privacy,
    data: {
      legalDocumentName: 'privacy',
      ...pageMetadataFor(APPLICATION_ROUTE_PATHS.privacy, 'seo.privacy'),
    } satisfies LegalTextRouteData & PageMetadataRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.terms,
    data: {
      legalDocumentName: 'terms',
      ...pageMetadataFor(APPLICATION_ROUTE_PATHS.terms, 'seo.terms'),
    } satisfies LegalTextRouteData & PageMetadataRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.refunds,
    data: {
      legalDocumentName: 'refunds',
      ...pageMetadataFor(APPLICATION_ROUTE_PATHS.refunds, 'seo.refunds'),
    } satisfies LegalTextRouteData & PageMetadataRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.fairUse,
    data: {
      legalDocumentName: 'fair-use',
      ...pageMetadataFor(APPLICATION_ROUTE_PATHS.fairUse, 'seo.fairUse'),
    } satisfies LegalTextRouteData & PageMetadataRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.cookies,
    data: {
      legalDocumentName: 'cookies',
      ...pageMetadataFor(APPLICATION_ROUTE_PATHS.cookies, 'seo.cookies'),
    } satisfies LegalTextRouteData & PageMetadataRouteData,
    loadComponent: () =>
      import('./features/legal/legal-text-page').then((module) => module.LegalTextPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.sitemap,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.sitemap, 'seo.sitemap'),
    loadComponent: () =>
      import('./features/legal/sitemap-page').then((module) => module.SitemapPage),
  },
];

/**
 * Groups the public pages under one language's address.
 *
 * <p>The default language keeps the bare addresses ({@code /tips}); every other language gets a
 * folder ({@code /sk/tips}). The group has no component of its own, so its pages render exactly as
 * they would at the top level, and the router moves on to the routes after it when none of its
 * pages match.</p>
 *
 * @param languageCode the language this group's pages are shown in
 * @returns the route grouping that language's public pages
 */
function localizedPagesFor(languageCode: SupportedLanguageCode): Route {
  return {
    path: languageCode === DEFAULT_LANGUAGE_CODE ? '' : languageCode,
    data: { addressLanguageCode: languageCode } satisfies AddressLanguageRouteData,
    canActivate: [followAddressLanguage],
    children: LOCALIZED_PAGE_ROUTES,
  };
}

/**
 * Every page of this website.
 *
 * <p>All of them are lazy: each page is its own bundle, fetched when it is first visited, so the
 * home page a first-time visitor lands on carries nothing but itself.</p>
 *
 * <p>Public pages come first, once per language. The rest (sign-in, account, the backend's mailed
 * addresses, administration) have one address and follow the reader's chosen language.</p>
 *
 * <p>Three paths are fixed by the backend, which builds the links it mails and the address it
 * redirects a Google sign-in to. They are listed in {@link APPLICATION_ROUTE_PATHS} with the
 * backend property that pins each one.</p>
 */
export const routes: Routes = [
  ...SUPPORTED_LANGUAGE_CODES.map(localizedPagesFor),
  {
    path: APPLICATION_ROUTE_PATHS.register,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.register, 'seo.register'),
    canActivate: [requiresAnonymousVisitor],
    loadComponent: () =>
      import('./features/register/register-page').then((module) => module.RegisterPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.login,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.login, 'seo.login'),
    canActivate: [requiresAnonymousVisitor],
    loadComponent: () => import('./features/login/login-page').then((module) => module.LoginPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.activateAccount,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.activateAccount, 'seo.activateAccount'),
    loadComponent: () =>
      import('./features/activate-account/activate-account-page').then(
        (module) => module.ActivateAccountPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.resetPassword,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.resetPassword, 'seo.resetPassword'),
    loadComponent: () =>
      import('./features/reset-password/reset-password-page').then(
        (module) => module.ResetPasswordPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.oauthCallback,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.oauthCallback, 'seo.oauthCallback'),
    loadComponent: () =>
      import('./features/oauth-callback/oauth-callback-page').then(
        (module) => module.OauthCallbackPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.devices,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.devices, 'seo.devices'),
    canActivate: [requiresSignedInUser],
    loadComponent: () =>
      import('./features/devices/devices-page').then((module) => module.DevicesPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.deviceDetail,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.deviceDetail, 'seo.deviceDetail'),
    canActivate: [requiresSignedInUser],
    loadComponent: () =>
      import('./features/devices/device-detail-page/device-detail-page').then(
        (module) => module.DeviceDetailPage,
      ),
  },
  {
    path: APPLICATION_ROUTE_PATHS.account,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.account, 'seo.account'),
    canActivate: [requiresSignedInUser],
    loadComponent: () =>
      import('./features/account/account-page').then((module) => module.AccountPage),
  },
  {
    // No guard: a buyer whose session ran out while paying still deserves the thanks, and is
    // offered the sign-in from the page rather than bounced off it.
    path: APPLICATION_ROUTE_PATHS.purchaseThankYou,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.purchaseThankYou, 'seo.purchaseThankYou'),
    loadComponent: () =>
      import('./features/purchase-thank-you/purchase-thank-you-page').then(
        (module) => module.PurchaseThankYouPage,
      ),
  },
  {
    // The operator's own pages. Guarded here so an expired session meets the sign-in form rather
    // than a page of failed requests; the backend is what actually refuses the calls.
    path: APPLICATION_ROUTE_PATHS.admin,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.admin, 'seo.admin'),
    loadComponent: () =>
      import('./features/admin/admin-login-page').then((module) => module.AdminLoginPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.adminUsers,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.adminUsers, 'seo.adminUsers'),
    canActivate: [requiresAdminSession],
    loadComponent: () =>
      import('./features/admin/admin-users-page').then((module) => module.AdminUsersPage),
  },
  {
    path: APPLICATION_ROUTE_PATHS.adminMetrics,
    data: pageMetadataFor(APPLICATION_ROUTE_PATHS.adminMetrics, 'seo.adminMetrics'),
    canActivate: [requiresAdminSession],
    loadComponent: () =>
      import('./features/admin/admin-metrics-page').then((module) => module.AdminMetricsPage),
  },
  {
    path: '**',
    data: pageMetadataFor('**', 'seo.notFound'),
    loadComponent: () =>
      import('./features/not-found/not-found-page').then((module) => module.NotFoundPage),
  },
];
