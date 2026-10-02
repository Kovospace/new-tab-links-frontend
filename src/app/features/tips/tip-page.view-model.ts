import { Injectable, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { SupportedLanguageCode } from '../../core/i18n/supported-language';
import { TranslationService } from '../../core/i18n/translation.service';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { LoadedPageDescription } from '../../core/seo/page-metadata';
import { PageMetadataService } from '../../core/seo/page-metadata.service';
import { renderTipMarkdown } from '../../core/tips/tip-markdown-renderer';
import { describeTipMarkdown } from '../../core/tips/tip-page-description';
import { TipNotFoundError, TipsContentService } from '../../core/tips/tips-content.service';

/** Where one tip's page stands. */
type TipPageState =
  | { readonly kind: 'LOADING' }
  | {
      readonly kind: 'SHOWN';
      readonly html: string;
      readonly pageDescription: LoadedPageDescription | null;
    }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'FAILED' };

const LOADING: TipPageState = { kind: 'LOADING' };

/**
 * State behind one tip's page.
 *
 * <p>The tip is chosen by the address — {@code /tips/<slug>}, the slug being its markdown file's
 * name — and shown in the reader's language, or in English until it is translated. Switching the
 * language on the page fetches the tip again, like every other text on the site.</p>
 */
@Injectable()
export class TipPageViewModel {
  private readonly route = inject(ActivatedRoute);
  private readonly tipsContentService = inject(TipsContentService);
  private readonly translationService = inject(TranslationService);
  private readonly pageMetadataService = inject(PageMetadataService);

  /** The tip the address names. */
  private readonly slug = toSignal(
    this.route.paramMap.pipe(map((parameters) => parameters.get('slug') ?? '')),
    { initialValue: '' },
  );

  /** What has to be fetched: this tip, in this language. */
  private readonly wantedTip = computed(() => ({
    slug: this.slug(),
    languageCode: this.translationService.currentLanguageCode(),
  }));

  /** The page's state, following the wanted tip; a newer request cancels an older one. */
  private readonly state = toSignal(
    toObservable(this.wantedTip).pipe(
      switchMap(({ slug, languageCode }) =>
        this.loadTip(slug, languageCode).pipe(startWith(LOADING)),
      ),
    ),
    { initialValue: LOADING },
  );

  /** Where the list of every tip is. */
  readonly tipsListLink = APPLICATION_ROUTE_LINKS.tips;

  /** Whether the tip is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.state().kind === 'LOADING');

  /** The tip, rendered, or empty until there is one. */
  readonly renderedHtml = computed<string>(() => {
    const state = this.state();
    return state.kind === 'SHOWN' ? state.html : '';
  });

  /** Why no tip is shown, in the reader's language, or empty while one is or may yet be. */
  readonly failureMessage = computed<string>(() => {
    switch (this.state().kind) {
      case 'NOT_FOUND':
        return this.translationService.translate('tips.notFound');
      case 'FAILED':
        return this.translationService.translate('tips.loadFailed');
      default:
        return '';
    }
  });

  /**
   * Titles the browser tab and the search result after the tip, once it has loaded. The route alone
   * only knows that this is "a tip".
   */
  constructor() {
    effect(() => {
      const state = this.state();
      if (state.kind === 'SHOWN' && state.pageDescription) {
        this.pageMetadataService.describeLoadedPage(state.pageDescription);
      }
    });
  }

  /**
   * Fetches and renders one tip.
   *
   * @param slug the tip's address below {@code /tips}
   * @param languageCode the reader's language
   * @returns the page state once the tip is in, or why it is not
   */
  private loadTip(slug: string, languageCode: SupportedLanguageCode): Observable<TipPageState> {
    return this.tipsContentService.loadTipMarkdown(slug, languageCode).pipe(
      map((loaded): TipPageState => ({
        kind: 'SHOWN',
        html: renderTipMarkdown(loaded.markdown, loaded.languageCode, slug),
        pageDescription: describeTipMarkdown(loaded.markdown),
      })),
      catchError((failure: unknown) =>
        of<TipPageState>({ kind: failure instanceof TipNotFoundError ? 'NOT_FOUND' : 'FAILED' }),
      ),
    );
  }
}
