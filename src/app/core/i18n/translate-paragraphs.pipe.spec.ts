import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateParagraphsPipe } from './translate-paragraphs.pipe';
import { TranslationService } from './translation.service';

/** A component doing exactly what a real template does: looping over the pipe's paragraphs. */
@Component({
  selector: 'app-paragraphs-host',
  imports: [TranslateParagraphsPipe],
  template: `
    @for (paragraph of 'home.text' | translateParagraphs; track paragraph) {
      <p>{{ paragraph }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ParagraphsHost {}

describe('TranslateParagraphsPipe', () => {
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
    languageCode: 'en' | 'sk',
    translations: Record<string, unknown>,
  ): Promise<void> {
    const loading = translationService.changeLanguage(languageCode);
    httpTestingController.expectOne(`i18n/${languageCode}.json`).flush(translations);
    await loading;
  }

  /** The rendered paragraphs, in order. */
  const renderedParagraphs = (element: HTMLElement): string[] =>
    [...element.querySelectorAll('p')].map((paragraph) => paragraph.textContent?.trim() ?? '');

  it('renders one paragraph for a translation authored as a plain string', async () => {
    await loadLanguage('en', { home: { text: 'One sentence is enough.' } });

    const fixture = TestBed.createComponent(ParagraphsHost);
    fixture.detectChanges();

    expect(renderedParagraphs(fixture.nativeElement)).toEqual(['One sentence is enough.']);
  });

  it('renders one paragraph per entry for a translation authored as an array', async () => {
    await loadLanguage('sk', { home: { text: ['Prvý odsek.', 'Druhý odsek.'] } });

    const fixture = TestBed.createComponent(ParagraphsHost);
    fixture.detectChanges();

    expect(renderedParagraphs(fixture.nativeElement)).toEqual(['Prvý odsek.', 'Druhý odsek.']);
  });

  it('changes the number of paragraphs when the language does', async () => {
    await loadLanguage('en', { home: { text: 'One sentence is enough.' } });

    const fixture = TestBed.createComponent(ParagraphsHost);
    fixture.detectChanges();
    expect(renderedParagraphs(fixture.nativeElement)).toHaveLength(1);

    await loadLanguage('sk', { home: { text: ['Prvý odsek.', 'Druhý odsek.'] } });
    fixture.detectChanges();

    expect(renderedParagraphs(fixture.nativeElement)).toEqual(['Prvý odsek.', 'Druhý odsek.']);
  });

  it('renders the key itself while nothing is loaded, so a gap is never silent', () => {
    const fixture = TestBed.createComponent(ParagraphsHost);
    fixture.detectChanges();

    expect(renderedParagraphs(fixture.nativeElement)).toEqual(['home.text']);
  });
});
