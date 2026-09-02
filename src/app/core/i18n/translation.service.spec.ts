import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NestedTranslationFile } from './translation-dictionary';
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

  /**
   * Loads a translation file into the service.
   *
   * @param translationFile the file's contents
   */
  async function loadTranslations(translationFile: NestedTranslationFile): Promise<void> {
    const loading = translationService.changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush(translationFile);
    await loading;
  }

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

  it('reports a single string as one paragraph', async () => {
    await loadTranslations({ home: { text: 'One sentence is enough.' } });

    expect(translationService.translateToParagraphs('home.text')).toEqual([
      'One sentence is enough.',
    ]);
  });

  it('reports a value authored as an array as one paragraph per entry', async () => {
    await loadTranslations({ home: { text: ['Prvý odsek.', 'Druhý odsek.'] } });

    expect(translationService.translateToParagraphs('home.text')).toEqual([
      'Prvý odsek.',
      'Druhý odsek.',
    ]);
  });

  it('shows the key itself when there are no paragraphs to show', () => {
    expect(translationService.translateToParagraphs('nothing.here')).toEqual(['nothing.here']);
  });

  it('substitutes placeholders in every paragraph, not only the first', async () => {
    await loadTranslations({ home: { text: ['Ahoj {name}.', 'Zbohom {name}.'] } });

    expect(translationService.translateToParagraphs('home.text', { name: 'Matej' })).toEqual([
      'Ahoj Matej.',
      'Zbohom Matej.',
    ]);
  });

  it('joins a multi-paragraph value for a caller that asked for one string', async () => {
    await loadTranslations({ home: { text: ['First paragraph.', 'Second paragraph.'] } });

    // A binding written before a translator split this text keeps working and keeps reading
    // correctly, rather than rendering an array or a raw key.
    expect(translationService.translate('home.text')).toBe('First paragraph. Second paragraph.');
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
