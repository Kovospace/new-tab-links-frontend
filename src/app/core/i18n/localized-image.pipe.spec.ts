import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LocalizedImagePipe, buildLocalizedImageUrl } from './localized-image.pipe';
import { TranslationService } from './translation.service';

/** A component doing exactly what a real template does: binding an image path through the pipe. */
@Component({
  selector: 'app-localized-image-host',
  imports: [LocalizedImagePipe],
  template: `<img [src]="'install/my-devices-screen.png' | localizedImage" alt="" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class LocalizedImageHost {}

describe('buildLocalizedImageUrl', () => {
  it('puts the language folder between the root and the path', () => {
    expect(buildLocalizedImageUrl('install/my-devices-screen.png', 'sk')).toBe(
      'images/sk/install/my-devices-screen.png',
    );
  });

  it('names the same file identically in every language', () => {
    expect(buildLocalizedImageUrl('install/my-devices-screen.png', 'en')).toBe(
      'images/en/install/my-devices-screen.png',
    );
  });

  it('accepts a path written with a leading slash without doubling it', () => {
    expect(buildLocalizedImageUrl('/install/my-devices-screen.png', 'sk')).toBe(
      'images/sk/install/my-devices-screen.png',
    );
  });

  it('returns a relative URL, so a site served below the domain root still resolves it', () => {
    expect(buildLocalizedImageUrl('install/my-devices-screen.png', 'en').startsWith('/')).toBe(
      false,
    );
  });
});

describe('LocalizedImagePipe', () => {
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
   * Loads one language, answering the request the service makes.
   *
   * @param languageCode language to load
   */
  async function loadLanguage(languageCode: 'en' | 'sk'): Promise<void> {
    const loading = translationService.changeLanguage(languageCode);
    httpTestingController.expectOne(`i18n/${languageCode}.json`).flush({});
    await loading;
  }

  /**
   * Reads the URL the host component put on its image.
   *
   * @param fixture the rendered host
   * @returns the src attribute as written into the DOM
   */
  function renderedImageUrl(fixture: { nativeElement: unknown }): string {
    return (fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('src') ?? '';
  }

  it('resolves the path against the active language', async () => {
    await loadLanguage('sk');

    const fixture = TestBed.createComponent(LocalizedImageHost);
    fixture.detectChanges();

    expect(renderedImageUrl(fixture)).toBe('images/sk/install/my-devices-screen.png');
  });

  // The reason the pipe is impure and carries an effect. A pure pipe caches against its argument,
  // which never changes, so this is the assertion that would fail first if either were dropped.
  it('re-points an image already on screen when the language changes', async () => {
    await loadLanguage('en');

    const fixture = TestBed.createComponent(LocalizedImageHost);
    fixture.detectChanges();
    expect(renderedImageUrl(fixture)).toBe('images/en/install/my-devices-screen.png');

    await loadLanguage('sk');
    fixture.detectChanges();

    expect(renderedImageUrl(fixture)).toBe('images/sk/install/my-devices-screen.png');
  });
});
