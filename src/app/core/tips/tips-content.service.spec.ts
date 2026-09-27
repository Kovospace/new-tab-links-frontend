import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LoadedTipMarkdown, TipNotFoundError, TipsContentService } from './tips-content.service';

/**
 * Fetching a tip: the reader's language first, English until it is translated.
 */
describe('TipsContentService', () => {
  let tipsContentService: TipsContentService;
  let httpTestingController: HttpTestingController;
  let loaded: LoadedTipMarkdown | undefined;
  let failure: unknown;

  const load = (languageCode: 'en' | 'sk'): void => {
    tipsContentService.loadTipMarkdown('profiles', languageCode).subscribe({
      next: (tip) => (loaded = tip),
      error: (error: unknown) => (failure = error),
    });
  };
  const notFound = { status: 404, statusText: 'Not Found' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    tipsContentService = TestBed.inject(TipsContentService);
    httpTestingController = TestBed.inject(HttpTestingController);
    loaded = undefined;
    failure = undefined;
  });

  afterEach(() => httpTestingController.verify());

  it("reads the tip in the reader's language", () => {
    load('sk');
    httpTestingController.expectOne('/content/tips/sk/profiles.md').flush('# Profily');

    expect(loaded).toEqual({ markdown: '# Profily', languageCode: 'sk' });
  });

  it('falls back to English for a tip not translated yet', () => {
    load('sk');
    httpTestingController.expectOne('/content/tips/sk/profiles.md').flush('', notFound);
    httpTestingController.expectOne('/content/tips/en/profiles.md').flush('# Profiles');

    expect(loaded).toEqual({ markdown: '# Profiles', languageCode: 'en' });
  });

  it("counts the development server's HTML fallback as a missing file", () => {
    load('sk');
    httpTestingController
      .expectOne('/content/tips/sk/profiles.md')
      .flush('<!doctype html><html></html>');
    httpTestingController.expectOne('/content/tips/en/profiles.md').flush('# Profiles');

    expect(loaded?.languageCode).toBe('en');
  });

  it('says there is no such tip when no language has it', () => {
    load('sk');
    httpTestingController.expectOne('/content/tips/sk/profiles.md').flush('', notFound);
    httpTestingController.expectOne('/content/tips/en/profiles.md').flush('', notFound);

    expect(failure).toBeInstanceOf(TipNotFoundError);
  });

  it('reads the generated index of every tip', () => {
    let index: unknown;
    tipsContentService.loadTipsIndex().subscribe((loadedIndex) => (index = loadedIndex));
    httpTestingController
      .expectOne('/content/tips/index.json')
      .flush({ en: [{ slug: 'profiles', title: 'Profiles' }] });

    expect(index).toEqual({ en: [{ slug: 'profiles', title: 'Profiles' }] });
  });
});
