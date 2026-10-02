import { Routes } from '@angular/router';
import { routes } from '@app/app.routes';
import { APPLICATION_ROUTE_PATHS } from '@app/core/routing/application-route-paths';
import { pageMetadataFor, readPageMetadata } from '@app/core/seo/page-metadata';
import { INDEXABLE_PAGE_PATHS } from '@app/core/seo/public-site';

describe('pageMetadataFor', () => {
  it('marks a page from the sitemap list as indexable', () => {
    expect(pageMetadataFor(APPLICATION_ROUTE_PATHS.download, 'seo.download').pageMetadata).toEqual({
      translationKeyPrefix: 'seo.download',
      indexable: true,
    });
  });

  it('marks a tip as indexable although the sitemap lists tips by slug', () => {
    expect(pageMetadataFor(APPLICATION_ROUTE_PATHS.tip, 'seo.tip').pageMetadata.indexable).toBe(
      true,
    );
  });

  it('keeps a private page out of search results', () => {
    expect(
      pageMetadataFor(APPLICATION_ROUTE_PATHS.account, 'seo.account').pageMetadata.indexable,
    ).toBe(false);
  });
});

describe('routes', () => {
  /** Every page route, the public ones once: each language group holds the same pages. */
  const pageRoutes: Routes = [
    ...(routes[0].children ?? []),
    ...routes.filter((route) => route.children === undefined),
  ];

  it('give every page a title, so no browser tab is left saying only "Tabilinks"', () => {
    const routesWithoutMetadata = pageRoutes
      .filter((route) => readPageMetadata(route.data ?? {}) === null)
      .map((route) => route.path);

    expect(routesWithoutMetadata).toEqual([]);
  });

  it('index exactly the pages the sitemap lists, plus each tip', () => {
    const indexedPaths = pageRoutes
      .filter((route) => readPageMetadata(route.data ?? {})?.indexable)
      .map((route) => route.path);

    expect(indexedPaths.sort()).toEqual(
      [...INDEXABLE_PAGE_PATHS, APPLICATION_ROUTE_PATHS.tip].sort(),
    );
  });

  it('give exactly the indexed pages an address per language', () => {
    const languageGroups = routes.filter((route) => route.children !== undefined);

    expect(languageGroups.map((group) => group.path)).toEqual(['', 'sk']);
    for (const group of languageGroups) {
      expect(group.children?.every((route) => readPageMetadata(route.data ?? {})?.indexable)).toBe(
        true,
      );
    }
  });
});
