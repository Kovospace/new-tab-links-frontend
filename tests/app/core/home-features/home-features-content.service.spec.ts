import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  HomeFeaturesContentService,
  RenderedHomeFeature,
} from '@app/core/home-features/home-features-content.service';

/**
 * The home page's points: in index order, in the reader's language where it exists, and a point
 * that cannot be loaded left out rather than taking the others with it.
 */
describe('HomeFeaturesContentService', () => {
  let service: HomeFeaturesContentService;
  let httpTestingController: HttpTestingController;
  let rendered: readonly RenderedHomeFeature[] | undefined;

  const notFound = { status: 404, statusText: 'Not Found' };
  const englishIndex = {
    en: [
      { slug: 'groups', fileName: '1-groups.md' },
      { slug: 'sync', fileName: '2-sync.md' },
    ],
  };

  const load = (languageCode: 'en' | 'sk'): void => {
    service.loadRenderedHomeFeatures(languageCode).subscribe((features) => (rendered = features));
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HomeFeaturesContentService);
    httpTestingController = TestBed.inject(HttpTestingController);
    rendered = undefined;
  });

  afterEach(() => httpTestingController.verify());

  it('renders every point in index order, its title as an h2', () => {
    load('en');
    httpTestingController.expectOne('/content/home-features/index.json').flush(englishIndex);
    httpTestingController.expectOne('/content/home-features/en/1-groups.md').flush('# Groups');
    httpTestingController.expectOne('/content/home-features/en/2-sync.md').flush('# Sync');

    expect(rendered?.map((feature) => feature.slug)).toEqual(['groups', 'sync']);
    expect(rendered?.[0].html).toContain('<h2>Groups</h2>');
  });

  it('uses the English list, and English files, for a language with none written', () => {
    load('sk');
    httpTestingController.expectOne('/content/home-features/index.json').flush(englishIndex);
    httpTestingController.expectOne('/content/home-features/sk/1-groups.md').flush('', notFound);
    httpTestingController.expectOne('/content/home-features/sk/2-sync.md').flush('', notFound);
    httpTestingController
      .expectOne('/content/home-features/en/1-groups.md')
      .flush('# Groups\n\n![Columns](columns.png)');
    httpTestingController.expectOne('/content/home-features/en/2-sync.md').flush('# Sync');

    expect(rendered?.length).toBe(2);
    expect(rendered?.[0].html).toContain('src="/images/en/home-features/groups/columns.png"');
  });

  it('leaves out a point that cannot be loaded', () => {
    load('en');
    httpTestingController.expectOne('/content/home-features/index.json').flush(englishIndex);
    httpTestingController
      .expectOne('/content/home-features/en/1-groups.md')
      .flush('', { status: 500, statusText: 'Server Error' });
    httpTestingController.expectOne('/content/home-features/en/2-sync.md').flush('# Sync');

    expect(rendered?.map((feature) => feature.slug)).toEqual(['sync']);
  });

  it('shows nothing when the index cannot be loaded', () => {
    load('en');
    httpTestingController.expectOne('/content/home-features/index.json').flush('', notFound);

    expect(rendered).toEqual([]);
  });
});
