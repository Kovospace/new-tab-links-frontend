import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let httpTestingController: HttpTestingController;
  let translationService: TranslationService;

  beforeEach(() => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    translationService = TestBed.inject(TranslationService);
  });

  afterEach(() => httpTestingController.verify());

  it('returns the key when it is not translated', () => {
    expect(translationService.translate('nothing.here')).toBe('nothing.here');
  });

  it('substitutes placeholders in a translated string', async () => {
    const loading = translationService.changeLanguage('en');
    httpTestingController
      .expectOne('i18n/en.json')
      .flush({ footer: { copyrightNotice: '© {year} {author}' } });
    await loading;

    expect(
      translationService.translate('footer.copyrightNotice', { year: 2026, author: 'Matej' }),
    ).toBe('© 2026 Matej');
  });

  it('keeps the previous language when loading a new one fails', async () => {
    const loadingEnglish = translationService.changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush({ nav: { home: 'Home' } });
    await loadingEnglish;

    const loadingSlovak = translationService.changeLanguage('sk');
    httpTestingController
      .expectOne('i18n/sk.json')
      .flush('', { status: 404, statusText: 'Not Found' });
    await loadingSlovak;

    expect(translationService.currentLanguageCode()).toBe('en');
    expect(translationService.translate('nav.home')).toBe('Home');
  });

  it('remembers the chosen language for the next visit', async () => {
    const loading = translationService.changeLanguage('sk');
    httpTestingController.expectOne('i18n/sk.json').flush({ nav: { home: 'Domov' } });
    await loading;

    expect(globalThis.localStorage.getItem('newtablinks.language')).toBe('sk');
  });
});
