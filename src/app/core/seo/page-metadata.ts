import { APPLICATION_ROUTE_PATHS } from '../routing/application-route-paths';
import { INDEXABLE_PAGE_PATHS } from './public-site';

/**
 * What a route tells search engines and link previews about its page.
 *
 * <p>Declared on the route rather than in each page, so that every page has a title even before its
 * component has loaded anything. A page whose title only exists once its content has loaded, like a
 * tip, adds it later through {@code PageMetadataService.describeLoadedPage}.</p>
 */
export interface PageMetadata {
  /**
   * Prefix of the page's strings in {@code public/i18n/}. The page's name is
   * {@code <prefix>.title}. An indexable page also has {@code <prefix>.description}, the sentence
   * a search result shows under the title. Other pages fall back to the site's own description.
   */
  readonly translationKeyPrefix: string;

  /**
   * Whether search engines should list this page.
   *
   * <p>False writes {@code noindex} and leaves out the canonical link. Never written by hand: see
   * {@link pageMetadataFor}.</p>
   */
  readonly indexable: boolean;
}

/** The shape of a route's {@code data} when it carries page metadata. */
export interface PageMetadataRouteData {
  readonly pageMetadata: PageMetadata;
}

/**
 * Metadata a page supplies once its content has loaded, overriding what its route declared.
 *
 * <p>Finished text, already in the reader's language: it comes from the content itself, not from
 * the translation files.</p>
 */
export interface LoadedPageDescription {
  readonly title: string;
  readonly description: string;
}

/**
 * Narrows a route's {@code data} to page metadata.
 *
 * @param routeData whatever the matched route declared
 * @returns the page metadata, or null for a route that declares none
 */
export function readPageMetadata(
  routeData: Readonly<Record<string, unknown>>,
): PageMetadata | null {
  const candidate = routeData['pageMetadata'];
  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }
  return candidate as PageMetadata;
}

/**
 * Builds a route's page metadata.
 *
 * <p>Whether the page is indexable is looked up rather than declared, from the same list the
 * sitemap is written from ({@code core/seo/public-site.json}). A page cannot then be in the sitemap
 * while asking not to be indexed, or the reverse. A tip is the one indexable route not on that list,
 * because the sitemap lists each tip by its slug instead.</p>
 *
 * @param routePath the route's path, from {@code APPLICATION_ROUTE_PATHS}
 * @param translationKeyPrefix where the page's title and description live in {@code public/i18n/}
 * @returns the route's {@code data}
 */
export function pageMetadataFor(
  routePath: string,
  translationKeyPrefix: string,
): PageMetadataRouteData {
  const indexable =
    INDEXABLE_PAGE_PATHS.includes(routePath) || routePath === APPLICATION_ROUTE_PATHS.tip;
  return { pageMetadata: { translationKeyPrefix, indexable } };
}
