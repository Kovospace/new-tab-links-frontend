import { APPLICATION_ROUTE_PATHS } from '@app/core/routing/application-route-paths';
import { DEFAULT_LANGUAGE_CODE } from '@app/core/i18n/supported-language';
import {
  INDEXABLE_PAGE_PATHS,
  PUBLIC_SITE_DEFAULT_LANGUAGE_CODE,
  PUBLIC_SITE_ORIGIN,
} from '@app/core/seo/public-site';

describe('public site', () => {
  it('lists only paths that are real routes, so the sitemap cannot point at a dead address', () => {
    const routePaths: readonly string[] = Object.values(APPLICATION_ROUTE_PATHS);

    for (const indexablePath of INDEXABLE_PAGE_PATHS) {
      expect(routePaths).toContain(indexablePath);
    }
  });

  it('never lists a private or one-time page', () => {
    expect(INDEXABLE_PAGE_PATHS).not.toContain(APPLICATION_ROUTE_PATHS.account);
    expect(INDEXABLE_PAGE_PATHS).not.toContain(APPLICATION_ROUTE_PATHS.devices);
    expect(INDEXABLE_PAGE_PATHS).not.toContain(APPLICATION_ROUTE_PATHS.activateAccount);
    expect(INDEXABLE_PAGE_PATHS).not.toContain(APPLICATION_ROUTE_PATHS.admin);
  });

  it('names an https origin without a trailing slash, as every absolute address assumes', () => {
    expect(PUBLIC_SITE_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
  });

  it('names the same default language as the application, which the sitemap script relies on', () => {
    expect(PUBLIC_SITE_DEFAULT_LANGUAGE_CODE).toBe(DEFAULT_LANGUAGE_CODE);
  });
});
