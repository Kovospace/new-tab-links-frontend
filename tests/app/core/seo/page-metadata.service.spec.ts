import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component, DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslationService } from '@app/core/i18n/translation.service';
import { pageMetadataFor } from '@app/core/seo/page-metadata';
import { PageMetadataService, stripQueryAndFragment } from '@app/core/seo/page-metadata.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

const ENGLISH_TRANSLATIONS = {
  seo: {
    titleFormat: '{page} · Tabilinks',
    site: { title: 'Tabilinks', description: 'The site.' },
    download: { title: 'Install', description: 'Install the extension.' },
    account: { title: 'My account' },
  },
};

const SLOVAK_TRANSLATIONS = {
  seo: {
    titleFormat: '{page} · Tabilinks',
    site: { title: 'Tabilinks', description: 'Stránka.' },
    download: { title: 'Inštalácia', description: 'Nainštalujte rozšírenie.' },
    account: { title: 'Môj účet' },
  },
};

describe('PageMetadataService', () => {
  let router: Router;
  let httpTestingController: HttpTestingController;
  let pageMetadataService: PageMetadataService;
  let document: Document;

  beforeEach(async () => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'download',
            component: BlankPage,
            data: pageMetadataFor('download', 'seo.download'),
          },
          {
            path: 'account',
            component: BlankPage,
            data: pageMetadataFor('account', 'seo.account'),
          },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    httpTestingController = TestBed.inject(HttpTestingController);
    document = TestBed.inject(DOCUMENT);

    await switchLanguage('en', ENGLISH_TRANSLATIONS);
    pageMetadataService = TestBed.inject(PageMetadataService);
    TestBed.runInInjectionContext(() => pageMetadataService.followNavigation());
  });

  afterEach(() => httpTestingController.verify());

  async function switchLanguage(languageCode: 'en' | 'sk', translations: object): Promise<void> {
    const switching = TestBed.inject(TranslationService).changeLanguage(languageCode);
    httpTestingController.expectOne(`i18n/${languageCode}.json`).flush(translations);
    await switching;
  }

  async function navigateTo(address: string): Promise<void> {
    await router.navigateByUrl(address);
    TestBed.tick();
  }

  function metaContent(selector: string): string | null {
    return document.head.querySelector(`meta[${selector}]`)?.getAttribute('content') ?? null;
  }

  function canonicalAddress(): string | null {
    return document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  }

  it('titles, describes and canonicalises an indexable page', async () => {
    await navigateTo('/download?from=mail#top');

    expect(document.title).toBe('Install · Tabilinks');
    expect(metaContent('name="description"')).toBe('Install the extension.');
    expect(metaContent('property="og:title"')).toBe('Install · Tabilinks');
    expect(canonicalAddress()).toBe('https://tabilinks.app/download');
    expect(metaContent('name="robots"')).toBeNull();
  });

  it('keeps a private page out of search results and falls back to the site description', async () => {
    await navigateTo('/download');
    await navigateTo('/account');

    expect(document.title).toBe('My account · Tabilinks');
    expect(metaContent('name="description"')).toBe('The site.');
    expect(metaContent('name="robots"')).toBe('noindex');
    expect(canonicalAddress()).toBeNull();
    expect(metaContent('property="og:url"')).toBeNull();
  });

  it('rewrites the head and the document language when the reader switches language', async () => {
    await navigateTo('/download');
    await switchLanguage('sk', SLOVAK_TRANSLATIONS);
    TestBed.tick();

    expect(document.title).toBe('Inštalácia · Tabilinks');
    expect(document.documentElement.lang).toBe('sk');
  });

  it('lets a page that loaded its own title describe itself until the next navigation', async () => {
    await navigateTo('/download');
    pageMetadataService.describeLoadedPage({ title: 'A tip', description: 'About tips.' });
    TestBed.tick();

    expect(document.title).toBe('A tip · Tabilinks');
    expect(metaContent('name="description"')).toBe('About tips.');

    await navigateTo('/account');
    expect(document.title).toBe('My account · Tabilinks');
  });
});

describe('stripQueryAndFragment', () => {
  it('keeps the path alone', () => {
    expect(stripQueryAndFragment('/tips/x?a=1#b')).toBe('/tips/x');
  });

  it('keeps the root a slash', () => {
    expect(stripQueryAndFragment('/?a=1')).toBe('/');
  });
});
