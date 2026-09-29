import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { TranslationService } from '../../core/i18n/translation.service';
import { LegalDocumentName, LegalDocumentsService } from '../../core/legal/legal-documents.service';

/**
 * Which legal document a route shows.
 *
 * <p>Declared on the route rather than baked into a component, so that the four documents are one
 * component and four route entries instead of four near-identical files.</p>
 */
export interface LegalTextRouteData {
  /** The document's file name, without {@code .md}. */
  readonly legalDocumentName: LegalDocumentName;
}

/** Where a legal page stands. */
type LegalTextPageState =
  | { readonly kind: 'LOADING' }
  | { readonly kind: 'SHOWN'; readonly html: string }
  | { readonly kind: 'FAILED' };

const LOADING: LegalTextPageState = { kind: 'LOADING' };

/**
 * State behind a legal document's page.
 *
 * <p>The document follows the reader's language: switching it fetches the document again, like
 * every other text on the site.</p>
 */
@Injectable()
export class LegalTextPageViewModel {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly legalDocumentsService = inject(LegalDocumentsService);
  private readonly translationService = inject(TranslationService);

  /** Which document this particular route asks for. */
  private readonly legalDocumentName = (this.activatedRoute.snapshot.data as LegalTextRouteData)
    .legalDocumentName;

  /** The page's state, following the language; a newer request cancels an older one. */
  private readonly state = toSignal(
    toObservable(this.translationService.currentLanguageCode).pipe(
      switchMap((languageCode) =>
        this.legalDocumentsService
          .loadRenderedLegalDocument(this.legalDocumentName, languageCode)
          .pipe(
            map((html): LegalTextPageState => ({ kind: 'SHOWN', html })),
            catchError(() => of<LegalTextPageState>({ kind: 'FAILED' })),
            startWith(LOADING),
          ),
      ),
    ),
    { initialValue: LOADING },
  );

  /** Whether the document is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.state().kind === 'LOADING');

  /** The document, rendered, or empty until there is one. */
  readonly renderedHtml = computed<string>(() => {
    const state = this.state();
    return state.kind === 'SHOWN' ? state.html : '';
  });

  /** Why no document is shown, in the reader's language, or empty while one is or may yet be. */
  readonly failureMessage = computed<string>(() =>
    this.state().kind === 'FAILED' ? this.translationService.translate('legal.loadFailed') : '',
  );
}
