import { Injectable, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import {
  ChangelogContentService,
  ReleaseNotFoundError,
} from '../../core/changelog/changelog-content.service';
import {
  readReleaseHighlights,
  renderReleaseMarkdown,
} from '../../core/changelog/release-markdown';
import { SupportedLanguageCode } from '../../core/i18n/supported-language';
import { TranslationService } from '../../core/i18n/translation.service';
import { ImageVersionStore } from '../../core/images/image-version.store';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';
import { LoadedPageDescription } from '../../core/seo/page-metadata';
import { PageMetadataService } from '../../core/seo/page-metadata.service';

/** Where a release's page stands. */
type ReleasePageState =
  | { readonly kind: 'LOADING' }
  | {
      readonly kind: 'SHOWN';
      readonly html: string;
      readonly pageDescription: LoadedPageDescription;
    }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'FAILED' };

const LOADING: ReleasePageState = { kind: 'LOADING' };

/**
 * State behind one release's page: the whole markdown file, description and screenshots included.
 *
 * <p>The release follows the reader's language, and is shown in English until it is translated.</p>
 */
@Injectable()
export class ReleasePageViewModel {
  private readonly route = inject(ActivatedRoute);
  private readonly changelogContentService = inject(ChangelogContentService);
  private readonly translationService = inject(TranslationService);
  private readonly pageMetadataService = inject(PageMetadataService);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);
  private readonly imageVersionStore = inject(ImageVersionStore);

  /** The release the address names. */
  private readonly version = toSignal(
    this.route.paramMap.pipe(map((parameters) => parameters.get('version') ?? '')),
    { initialValue: '' },
  );

  /** What has to be fetched: this release, in this language. */
  private readonly wantedRelease = computed(() => ({
    version: this.version(),
    languageCode: this.translationService.currentLanguageCode(),
  }));

  /** The page's state, following the wanted release; a newer request cancels an older one. */
  private readonly state = toSignal(
    toObservable(this.wantedRelease).pipe(
      switchMap(({ version, languageCode }) =>
        this.loadRelease(version, languageCode).pipe(startWith(LOADING)),
      ),
    ),
    { initialValue: LOADING },
  );

  /** Where the list of every release is. */
  readonly changelogLink = computed<string>(() => this.localizedRouteLinks.links().changelog);

  /** Whether the release is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.state().kind === 'LOADING');

  /** The release, rendered, or empty until there is one. */
  readonly renderedHtml = computed<string>(() => {
    const state = this.state();
    return state.kind === 'SHOWN' ? state.html : '';
  });

  /** Why no release is shown, in the reader's language, or empty while one is or may yet be. */
  readonly failureMessage = computed<string>(() => {
    switch (this.state().kind) {
      case 'NOT_FOUND':
        return this.translationService.translate('changelog.notFound');
      case 'FAILED':
        return this.translationService.translate('changelog.loadFailed');
      default:
        return '';
    }
  });

  /**
   * Titles the browser tab and the search result after the release once it has loaded; the route
   * alone only knows that this is "a release".
   */
  constructor() {
    effect(() => {
      const state = this.state();
      if (state.kind === 'SHOWN') {
        this.pageMetadataService.describeLoadedPage(state.pageDescription);
      }
    });
  }

  /**
   * Fetches and renders one release.
   *
   * @param version the release's version
   * @param languageCode the reader's language
   * @returns the page state once the release is in, or why it is not
   */
  private loadRelease(
    version: string,
    languageCode: SupportedLanguageCode,
  ): Observable<ReleasePageState> {
    return this.changelogContentService.loadReleaseMarkdown(version, languageCode).pipe(
      map((loaded): ReleasePageState => ({
        kind: 'SHOWN',
        html: renderReleaseMarkdown(
          loaded.markdown,
          loaded.languageCode,
          version,
          this.imageVersionStore.versionImageUrl,
        ),
        pageDescription: {
          title: this.translationService.translate('changelog.releaseTitle', { version }),
          description: readReleaseHighlights(loaded.markdown).join(' '),
        },
      })),
      catchError((failure: unknown) =>
        of<ReleasePageState>({
          kind: failure instanceof ReleaseNotFoundError ? 'NOT_FOUND' : 'FAILED',
        }),
      ),
    );
  }
}
