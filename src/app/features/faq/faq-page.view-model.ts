import { DestroyRef, Injectable, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { FaqContentService, LoadedFaq } from '../../core/faq/faq-content.service';
import { buildFaqPageStructuredData } from '../../core/faq/faq-structured-data';
import { TranslationService } from '../../core/i18n/translation.service';
import { StructuredDataWriter } from '../../core/seo/structured-data.writer';

/** Where the FAQ page stands. */
type FaqPageState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'SHOWN'; readonly faq: LoadedFaq }
  | { readonly kind: 'FAILED' };

const LOADING: FaqPageState = { kind: 'LOADING' };

/**
 * State behind the FAQ page.
 *
 * <p>The FAQ follows the reader's language, like every other text on the site. Besides showing
 * it, the page describes its questions to search engines as an {@code FAQPage} — the reason the
 * page exists — and takes that description away again when the reader leaves.</p>
 */
@Injectable()
export class FaqPageViewModel {
  private readonly faqContentService = inject(FaqContentService);
  private readonly translationService = inject(TranslationService);
  private readonly structuredDataWriter = inject(StructuredDataWriter);

  /** The page's state, following the language; a newer request cancels an older one. */
  private readonly state = toSignal(
    toObservable(this.translationService.currentLanguageCode).pipe(
      switchMap((languageCode) =>
        this.faqContentService.loadFaq(languageCode).pipe(
          map((faq): FaqPageState => ({ kind: 'SHOWN', faq })),
          catchError(() => of<FaqPageState>({ kind: 'FAILED' })),
          startWith(LOADING),
        ),
      ),
    ),
    { initialValue: LOADING },
  );

  /** Whether the FAQ is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.state().kind === 'LOADING');

  /** The FAQ, rendered, or empty until there is one. */
  readonly renderedHtml = computed<string>(() => {
    const state = this.state();
    return state.kind === 'SHOWN' ? state.faq.html : '';
  });

  /** Why no FAQ is shown, in the reader's language, or empty while one is or may yet be. */
  readonly failureMessage = computed<string>(() =>
    this.state().kind === 'FAILED' ? this.translationService.translate('faq.loadFailed') : '',
  );

  constructor() {
    effect(() => this.writeStructuredData(this.state()));
    inject(DestroyRef).onDestroy(() => this.structuredDataWriter.remove());
  }

  /**
   * Keeps the page's structured data in step with the FAQ shown: written once it has loaded,
   * removed while there is nothing to describe.
   *
   * @param state the page's current state
   */
  private writeStructuredData(state: FaqPageState): void {
    if (state.kind !== 'SHOWN' || state.faq.entries.length === 0) {
      this.structuredDataWriter.remove();
      return;
    }
    this.structuredDataWriter.write(
      buildFaqPageStructuredData(state.faq.entries, state.faq.languageCode),
    );
  }
}
