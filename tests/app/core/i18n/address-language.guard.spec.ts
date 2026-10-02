import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { followAddressLanguage } from '@app/core/i18n/address-language.guard';
import { LanguageSwitchService } from '@app/core/i18n/language-switch.service';
import { TranslationService } from '@app/core/i18n/translation.service';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class BlankPage {}

const PUBLIC_PAGES = [{ path: 'tips', component: BlankPage }];

describe('followAddressLanguage and LanguageSwitchService', () => {
  let router: Router;
  let translationService: TranslationService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        provideRouter([
          {
            path: '',
            data: { addressLanguageCode: 'en' },
            canActivate: [followAddressLanguage],
            children: PUBLIC_PAGES,
          },
          {
            path: 'sk',
            data: { addressLanguageCode: 'sk' },
            canActivate: [followAddressLanguage],
            children: PUBLIC_PAGES,
          },
          { path: 'login', component: BlankPage },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    translationService = TestBed.inject(TranslationService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  function answerTranslationRequest(languageCode: string): void {
    httpTestingController.expectOne(`i18n/${languageCode}.json`).flush({ language: languageCode });
  }

  /** Lets the guard's translation request go out before it is answered. */
  async function settle(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('shows a prefixed address in its own language, whatever the reader preferred', async () => {
    const navigating = router.navigateByUrl('/sk/tips');
    await settle();
    answerTranslationRequest('sk');
    await navigating;

    expect(router.url).toBe('/sk/tips');
    expect(translationService.currentLanguageCode()).toBe('sk');
  });

  it('sends a reader who chose Slovak from an English address to the Slovak one', async () => {
    globalThis.localStorage?.setItem('newtablinks.language', 'sk');

    const navigating = router.navigateByUrl('/tips?x=1');
    await settle();
    answerTranslationRequest('sk');
    await navigating;

    expect(router.url).toBe('/sk/tips?x=1');
  });

  it('switches a public page to the same page at the other language address', async () => {
    const arriving = router.navigateByUrl('/sk/tips');
    await settle();
    answerTranslationRequest('sk');
    await arriving;

    const switching = TestBed.inject(LanguageSwitchService).switchLanguage('en');
    await settle();
    answerTranslationRequest('en');
    await switching;

    expect(router.url).toBe('/tips');
    expect(translationService.currentLanguageCode()).toBe('en');
  });

  it('switches a page with one address in place', async () => {
    await router.navigateByUrl('/login');

    const switching = TestBed.inject(LanguageSwitchService).switchLanguage('sk');
    await settle();
    answerTranslationRequest('sk');
    await switching;

    expect(router.url).toBe('/login');
    expect(translationService.currentLanguageCode()).toBe('sk');
  });
});
