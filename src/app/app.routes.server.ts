import { inject } from '@angular/core';
import { RenderMode, ServerRoute } from '@angular/ssr';
import { firstValueFrom } from 'rxjs';
import { localizeAddress } from './core/i18n/localized-address';
import { SUPPORTED_LANGUAGE_CODES, SupportedLanguageCode } from './core/i18n/supported-language';
import { APPLICATION_ROUTE_PATHS } from './core/routing/application-route-paths';
import { INDEXABLE_PAGE_PATHS } from './core/seo/public-site';
import { TipsContentService } from './core/tips/tips-content.service';

/**
 * A route path as the server routes spell it: no leading slash, the home page empty.
 *
 * @param routePath a path from {@code APPLICATION_ROUTE_PATHS}
 * @param languageCode the language whose address is wanted
 * @returns such as {@code sk/tips}, or {@code sk} for the Slovak home page
 */
function serverRoutePath(routePath: string, languageCode: SupportedLanguageCode): string {
  return localizeAddress(`/${routePath}`, languageCode).slice(1);
}

/**
 * Renders one public page in one language at build time.
 *
 * @param routePath the page's route path
 * @param languageCode the language to render it in
 * @returns the server route
 */
function prerenderedPage(routePath: string, languageCode: SupportedLanguageCode): ServerRoute {
  return { path: serverRoutePath(routePath, languageCode), renderMode: RenderMode.Prerender };
}

/**
 * Renders every tip in one language at build time, one page per slug in the tips index.
 *
 * <p>Every slug in every language, not only the tips written in that language. The site shows the
 * English text where a translation is missing, and that page has to exist as a file too, or its
 * address would be a 404 to anyone without JavaScript.</p>
 *
 * @param languageCode the language to render the tips in
 * @returns the server route
 */
function prerenderedTips(languageCode: SupportedLanguageCode): ServerRoute {
  return {
    path: serverRoutePath(APPLICATION_ROUTE_PATHS.tip, languageCode),
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const tipsIndex = await firstValueFrom(inject(TipsContentService).loadTipsIndex());
      const slugs = new Set(
        Object.values(tipsIndex).flatMap((tips) => (tips ?? []).map((tip) => tip.slug)),
      );
      return [...slugs].map((slug) => ({ slug }));
    },
  };
}

/**
 * Which pages are rendered to HTML when the image is built, and which only in the browser.
 *
 * <p>Every public page, in every language, is rendered at build time. Those are the pages a search
 * engine, an AI crawler or a link preview reads, and most of them never run JavaScript. The build
 * writes each one to {@code <path>/index.html}, and nginx serves it as it serves any file.</p>
 *
 * <p>Everything else (sign-in, the account, the backend's mailed addresses, administration) is
 * rendered in the browser only, from {@code index.csr.html}. Those pages are about one signed-in
 * person, and there is nothing in them worth publishing.</p>
 */
export const serverRoutes: ServerRoute[] = [
  ...SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => [
    ...INDEXABLE_PAGE_PATHS.map((routePath) => prerenderedPage(routePath, languageCode)),
    prerenderedTips(languageCode),
  ]),
  { path: '**', renderMode: RenderMode.Client },
];
