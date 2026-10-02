import { Injectable, computed, inject } from '@angular/core';
import { localizeAddress } from '../i18n/localized-address';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { TranslationService } from '../i18n/translation.service';
import { INDEXABLE_PAGE_PATHS } from '../seo/public-site';
import { APPLICATION_ROUTE_LINKS, APPLICATION_ROUTE_PATHS } from './application-route-paths';

/** A page of this website, named as in {@link APPLICATION_ROUTE_LINKS}. */
export type ApplicationRouteName = keyof typeof APPLICATION_ROUTE_LINKS;

/** Every route's link, as {@link APPLICATION_ROUTE_LINKS} has them, in one language. */
export type ApplicationRouteLinks = { readonly [routeName in ApplicationRouteName]: string };

/**
 * Every route's link in one language.
 *
 * <p>Only public pages have an address per language. The rest come back exactly as
 * {@link APPLICATION_ROUTE_LINKS} has them. Which pages are public is read from the same list the
 * sitemap and the routes use, so nothing here names them a second time.</p>
 *
 * @param languageCode the language the links should open in
 * @returns the links, the public ones in that language
 */
export function localizeRouteLinks(languageCode: SupportedLanguageCode): ApplicationRouteLinks {
  const routeNames = Object.keys(APPLICATION_ROUTE_LINKS) as ApplicationRouteName[];
  return Object.fromEntries(
    routeNames.map((routeName) => {
      const link = APPLICATION_ROUTE_LINKS[routeName];
      const isPublicPage = INDEXABLE_PAGE_PATHS.includes(APPLICATION_ROUTE_PATHS[routeName]);
      return [routeName, isPublicPage ? localizeAddress(link, languageCode) : link];
    }),
  ) as ApplicationRouteLinks;
}

/**
 * Builds the link of one tip in one language.
 *
 * @param slug the tip's markdown file name
 * @param languageCode the language the tip should open in
 * @returns such as {@code /sk/tips/profiles}
 */
export function localizeTipLink(slug: string, languageCode: SupportedLanguageCode): string {
  return localizeAddress(`${APPLICATION_ROUTE_LINKS.tips}/${slug}`, languageCode);
}

/**
 * The links to bind in templates and navigate to from view-models, in the reader's language.
 *
 * <p>Use this rather than {@link APPLICATION_ROUTE_LINKS} wherever a link may point at a public
 * page. A Slovak reader on {@code /sk/tips} clicking "Home" should stay in Slovak, and would
 * otherwise be sent to the English home page and redirected back.</p>
 */
@Injectable({ providedIn: 'root' })
export class LocalizedRouteLinks {
  private readonly translationService = inject(TranslationService);

  /** Every route's link, the public pages' in the reader's language. */
  readonly links = computed<ApplicationRouteLinks>(() =>
    localizeRouteLinks(this.translationService.currentLanguageCode()),
  );

  /**
   * The link of one tip, in the reader's language.
   *
   * @param slug the tip's markdown file name
   * @returns the tip's link
   */
  tipLink(slug: string): string {
    return localizeTipLink(slug, this.translationService.currentLanguageCode());
  }
}
