import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslatePipe } from '@app/core/i18n/translate.pipe';
import { TranslationService } from '@app/core/i18n/translation.service';

/** A component doing exactly what every real template does: binding a key through the pipe. */
@Component({
  selector: 'app-translation-host',
  imports: [TranslatePipe],
  template: `<h1>{{ 'nav.home' | translate }}</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TranslationHost {}

describe('TranslatePipe', () => {
  let httpTestingController: HttpTestingController;
  let translationService: TranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    translationService = TestBed.inject(TranslationService);
  });

  afterEach(() => httpTestingController.verify());

  /**
   * Loads one language, answering the request the service makes.
   *
   * @param languageCode language to load
   * @param translations file contents to answer with
   */
  async function loadLanguage(
    languageCode: string,
    translations: Record<string, unknown>,
  ): Promise<void> {
    const loading = translationService.changeLanguage(languageCode as 'en' | 'sk');
    httpTestingController.expectOne(`i18n/${languageCode}.json`).flush(translations);
    await loading;
  }

  it('renders the key itself while nothing is loaded, so a gap is never silent', () => {
    const fixture = TestBed.createComponent(TranslationHost);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('nav.home');
  });

  it('renders the translated text once a language has loaded', async () => {
    await loadLanguage('en', { nav: { home: 'Home' } });

    const fixture = TestBed.createComponent(TranslationHost);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Home');
  });

  it('re-renders an already rendered template when the language changes', async () => {
    await loadLanguage('en', { nav: { home: 'Home' } });

    const fixture = TestBed.createComponent(TranslationHost);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Home');

    await loadLanguage('sk', { nav: { home: 'Domov' } });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Domov');
  });
});
