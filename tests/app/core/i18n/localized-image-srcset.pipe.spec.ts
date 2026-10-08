import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  LocalizedImageSrcsetPipe,
  buildLocalizedImageSrcset,
} from '@app/core/i18n/localized-image-srcset.pipe';
import { TranslationService } from '@app/core/i18n/translation.service';

/** A component doing exactly what a real template does: binding a 1x path through the pipe. */
@Component({
  selector: 'app-localized-image-srcset-host',
  imports: [LocalizedImageSrcsetPipe],
  template: `<img [srcset]="'install/login-menu_1x.webp' | localizedImageSrcset" alt="" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class LocalizedImageSrcsetHost {}

describe('buildLocalizedImageSrcset', () => {
  it('names the 1x, 2x and 3x copies in the language folder', () => {
    expect(buildLocalizedImageSrcset('install/login-menu_1x.webp', 'sk')).toBe(
      'images/sk/install/login-menu_1x.webp 1x, ' +
        'images/sk/install/login-menu_2x.webp 2x, ' +
        'images/sk/install/login-menu_3x.webp 3x',
    );
  });

  it('offers nothing for an image that is not the 1x copy of a set', () => {
    expect(buildLocalizedImageSrcset('install/login-menu.webp', 'sk')).toBe('');
  });
});

describe('LocalizedImageSrcsetPipe', () => {
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
   * Reads the srcset the host component put on its image.
   *
   * @param fixture the rendered host
   * @returns the srcset attribute as written into the DOM
   */
  function renderedSrcset(fixture: { nativeElement: unknown }): string {
    return (
      (fixture.nativeElement as HTMLElement).querySelector('img')?.getAttribute('srcset') ?? ''
    );
  }

  // The reason the pipe is impure and carries an effect, as for LocalizedImagePipe.
  it('re-points an image already on screen when the language changes', async () => {
    await loadLanguage('en');

    const fixture = TestBed.createComponent(LocalizedImageSrcsetHost);
    fixture.detectChanges();
    expect(renderedSrcset(fixture)).toContain('images/en/install/login-menu_3x.webp 3x');

    await loadLanguage('sk');
    fixture.detectChanges();

    expect(renderedSrcset(fixture)).toContain('images/sk/install/login-menu_3x.webp 3x');
  });
});
