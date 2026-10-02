import publicSite from './public-site.json';

/**
 * The address this website is published at, without a trailing slash.
 *
 * <p>Compiled in rather than read from {@code config.json}, which looks like it breaks the rule that
 * nothing environment-dependent is a constant. It does not, because this is not where <em>this
 * copy</em> runs. It is the address search engines and link previews should credit. A staging copy
 * whose canonical links pointed at itself would compete with production in search results.
 * Pointing at production is the correct behaviour for every copy.</p>
 *
 * <p>Kept in {@code public-site.json} rather than here, so that {@code
 * scripts/build-crawler-files.mjs} can read the same value when it writes {@code robots.txt} and
 * {@code sitemap.xml}. Node cannot import this TypeScript file, but it can read that JSON.</p>
 */
export const PUBLIC_SITE_ORIGIN: string = publicSite.siteOrigin;

/**
 * The route paths of every page a search engine should index, as written in
 * {@code APPLICATION_ROUTE_PATHS}. A tip ({@code tips/:slug}) is indexable too, but is listed per
 * slug from the tips index rather than here.
 *
 * <p>Everything else is left out on purpose: sign-in and registration are thin forms, the account
 * and devices pages are private, the backend's mailed and redirected addresses carry one-time
 * tokens, and {@code /admin} is not advertised anywhere. A spec checks that each entry is a real
 * route path, so a renamed route cannot leave a dead address in the sitemap.</p>
 */
export const INDEXABLE_PAGE_PATHS: readonly string[] = publicSite.indexablePagePaths;
