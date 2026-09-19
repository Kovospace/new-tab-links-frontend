import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { TranslationService } from './core/i18n/translation.service';

/** Enough of the real translation file to prove the shell is wired to it. */
const ENGLISH_TRANSLATIONS = {
  site: { title: 'NewTabLinks', tagline: 'Your links, everywhere.' },
  nav: {
    home: 'Home',
    download: 'Download',
    register: 'Register',
    login: 'Login',
    skipToContent: 'Skip to content',
  },
  footer: {
    gdpr: 'GDPR compliance',
    cookies: 'Cookies compliance',
    sitemap: 'Sitemap',
    authorName: 'Matej Kovacs',
    authorSiteLabel: 'kovo.space',
    copyrightNotice: '© {year} {author}',
  },
  home: { heading: 'A new tab that finally does something useful', callToAction: 'Get it' },
  language: { en: 'English', sk: 'Slovak', switchLabel: 'Language' },
};

describe('App shell', () => {
  let fixture: ComponentFixture<App>;
  let httpTestingController: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const loadingEnglish = TestBed.inject(TranslationService).changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush(ENGLISH_TRANSLATIONS);
    await loadingEnglish;

    fixture = TestBed.createComponent(App);
    await router.navigate(['/']);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => httpTestingController.verify());

  /** The rendered page, as a reader would see it. */
  function renderedPage(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the site title in the top bar', () => {
    // The wordmark, not a translated string: the header spells it as `<em>Tabi</em>links` so the
    // first half can be styled, and it reads the same in every language. Asserting textContent
    // rather than the markup is what keeps that styling free to change.
    expect(renderedPage().querySelector('.page-header__title')?.textContent).toContain('Tabilinks');
  });

  it('offers an anonymous visitor the four public destinations', () => {
    const navigationLabels = Array.from(
      renderedPage().querySelectorAll('.page-header__navigation-link'),
    ).map((link) => link.textContent?.trim());

    expect(navigationLabels).toEqual(['Home', 'Download', 'Register', 'Login']);
  });

  it('renders the routed home page inside the shell', () => {
    expect(renderedPage().querySelector('app-home-page h1')?.textContent).toContain(
      'A new tab that finally does something useful',
    );
  });

  it('shows a copyright line carrying the current year and the author', () => {
    const copyrightLine = renderedPage().querySelector('.page-footer__copyright')?.textContent;

    expect(copyrightLine).toContain(String(new Date().getFullYear()));
    expect(copyrightLine).toContain('Matej Kovacs');
  });

  it('links the author name to their own website', () => {
    const authorLink = renderedPage().querySelector('.page-footer__author-link');

    expect(authorLink?.getAttribute('href')).toBe('https://kovo.space');
    expect(authorLink?.textContent).toContain('kovo.space');
  });

  it('renders the compliance and sitemap links in the footer', () => {
    const footerLabels = Array.from(renderedPage().querySelectorAll('.page-footer__link')).map(
      (link) => link.textContent?.trim(),
    );

    expect(footerLabels).toEqual(['GDPR compliance', 'Cookies compliance', 'Sitemap']);
  });
});
