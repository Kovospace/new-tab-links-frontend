import { DestroyRef, Injectable, Injector, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { localizeAddress, splitLanguagePrefix } from '../i18n/localized-address';
import { DEFAULT_LANGUAGE_CODE, SUPPORTED_LANGUAGE_CODES } from '../i18n/supported-language';
import { TranslationService } from '../i18n/translation.service';
import { AlternateAddress, DocumentHeadContent, DocumentHeadWriter } from './document-head.writer';
import { LoadedPageDescription, PageMetadata, readPageMetadata } from './page-metadata';
import { PUBLIC_SITE_ORIGIN } from './public-site';

/** Used for a route that declares no metadata, which is a mistake but should not leave a blank tab. */
const FALLBACK_PAGE_METADATA: PageMetadata = { translationKeyPrefix: 'seo.site', indexable: false };

/**
 * Keeps the document's title, description and canonical link in step with the page being shown.
 *
 * <p>Three things decide them: the route's {@link PageMetadata}, the reader's language, and, for a
 * page whose title is its content, what that page supplied once it loaded. All three are signals,
 * so a language switch rewrites the head without a navigation.</p>
 *
 * <p>Googlebot runs this code and reads the result. Link previews do not run it, so for them the
 * static tags in {@code src/index.html} are all there is until pages are rendered at build time.</p>
 */
@Injectable({ providedIn: 'root' })
export class PageMetadataService {
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);
  private readonly documentHeadWriter = inject(DocumentHeadWriter);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly routeMetadata = signal<PageMetadata>(FALLBACK_PAGE_METADATA);

  /** The path of the page being shown, without query or fragment, which never belong in a canonical. */
  private readonly currentPath = signal<string>('/');

  private readonly loadedPageDescription = signal<LoadedPageDescription | null>(null);

  /** The head the current page should have, worded in the current language. */
  readonly documentHeadContent = computed<DocumentHeadContent>(() => {
    const metadata = this.routeMetadata();
    const loadedDescription = this.loadedPageDescription();
    return {
      languageCode: this.translationService.currentLanguageCode(),
      title: this.wordTitle(loadedDescription?.title ?? this.translatePageName(metadata)),
      description: loadedDescription?.description ?? this.translateDescription(metadata),
      openGraphLocale: this.translationService.translate('seo.openGraphLocale'),
      canonicalAddress: metadata.indexable ? `${PUBLIC_SITE_ORIGIN}${this.currentPath()}` : null,
      alternateAddresses: metadata.indexable ? listAlternateAddresses(this.currentPath()) : [],
    };
  });

  /**
   * Starts following navigation. Called once, from an application initializer.
   */
  followNavigation(): void {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((routerEvent) => {
      if (routerEvent instanceof NavigationStart) {
        // Cleared at the start, not the end: the next page may describe itself before its
        // navigation has finished, and that description must not be wiped out.
        this.loadedPageDescription.set(null);
      } else if (routerEvent instanceof NavigationEnd) {
        this.routeMetadata.set(this.readDeepestRouteMetadata());
        this.currentPath.set(stripQueryAndFragment(routerEvent.urlAfterRedirects));
      }
    });
    effect(() => this.documentHeadWriter.write(this.documentHeadContent()), {
      injector: this.injector,
    });
  }

  /**
   * Lets a page whose title comes from its own content describe itself, once that content has
   * loaded. Lasts until the next navigation starts.
   *
   * @param loadedPageDescription the page's title and description, in the reader's language
   */
  describeLoadedPage(loadedPageDescription: LoadedPageDescription): void {
    this.loadedPageDescription.set(loadedPageDescription);
  }

  private readDeepestRouteMetadata(): PageMetadata {
    let snapshot: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    return readPageMetadata(snapshot.data) ?? FALLBACK_PAGE_METADATA;
  }

  private translatePageName(metadata: PageMetadata): string {
    return this.translationService.translate(`${metadata.translationKeyPrefix}.title`);
  }

  private translateDescription(metadata: PageMetadata): string {
    const descriptionKey = metadata.indexable
      ? `${metadata.translationKeyPrefix}.description`
      : 'seo.site.description';
    return this.translationService.translate(descriptionKey);
  }

  private wordTitle(pageName: string): string {
    return this.translationService.translate('seo.titleFormat', { page: pageName });
  }
}

/**
 * Drops the query and fragment from a router address.
 *
 * @param routerUrl an address as the router reports it, such as {@code /tips?x=1#top}
 * @returns the path alone, such as {@code /tips}
 */
export function stripQueryAndFragment(routerUrl: string): string {
  return routerUrl.split(/[?#]/)[0] || '/';
}

/**
 * Lists a public page's address in every language, plus the {@code x-default} search engines
 * send a reader of any other language to: the default language's.
 *
 * @param currentPath the page's path in whichever language it is being shown in
 * @returns one entry per language, then {@code x-default}
 */
export function listAlternateAddresses(currentPath: string): readonly AlternateAddress[] {
  const { unprefixedAddress } = splitLanguagePrefix(currentPath);
  const addressIn = (languageCode: (typeof SUPPORTED_LANGUAGE_CODES)[number]) =>
    `${PUBLIC_SITE_ORIGIN}${localizeAddress(unprefixedAddress, languageCode)}`;
  return [
    ...SUPPORTED_LANGUAGE_CODES.map((languageCode) => ({
      hreflang: languageCode,
      address: addressIn(languageCode),
    })),
    { hreflang: 'x-default', address: addressIn(DEFAULT_LANGUAGE_CODE) },
  ];
}
