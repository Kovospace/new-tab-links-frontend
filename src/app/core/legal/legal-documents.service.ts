import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { PlanLimits } from '../api/models/plan-limits.model';
import { LocalizedMarkdownService } from '../content/localized-markdown.service';
import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { ImageVersionStore } from '../images/image-version.store';
import { COMPILED_PLAN_LIMITS } from '../plan-limits/compiled-plan-limits';
import { fairUsePlaceholderValues } from '../plan-limits/plan-limit-placeholders';
import { PublishedPlanLimitsStore } from '../plan-limits/published-plan-limits.store';
import { LEGAL_DOCUMENTS_EFFECTIVE_DATE, LEGAL_OPERATOR } from './legal-operator';

/**
 * Where the legal documents are served from; they ship in {@code public/content/legal}, one
 * folder per language.
 */
const LEGAL_CONTENT_ROOT = '/content/legal';

/** Where a legal document's relatively named images would live, below {@code /images/<lang>/}. */
const LEGAL_IMAGE_FOLDER = 'legal';

/** Every legal document the site publishes; each is {@code <name>.md} in every language. */
export type LegalDocumentName = 'privacy' | 'cookies' | 'terms' | 'refunds' | 'fair-use';

/**
 * The fixed placeholders a legal document may use, and what each is replaced with.
 *
 * <p>The operator's details are written once, in {@link LEGAL_OPERATOR}, rather than into eight
 * markdown files where one of them would sooner or later be missed. The Fair Use limits
 * ({@code {fairUseLinksPerWorkspace}} and the rest) are placeholders too, but not fixed ones: the
 * operator changes them, so they are filled from {@link PublishedPlanLimitsStore}.</p>
 */
const LEGAL_DOCUMENT_PLACEHOLDERS: Readonly<Record<string, string>> = {
  operatorName: LEGAL_OPERATOR.name,
  operatorRegistrationNumber: LEGAL_OPERATOR.registrationNumber,
  operatorAddress: LEGAL_OPERATOR.address,
  supportEmail: LEGAL_OPERATOR.supportEmail,
  effectiveDate: LEGAL_DOCUMENTS_EFFECTIVE_DATE,
};

/**
 * The privacy policy, the terms, the refund policy, the fair use policy and the cookie statement — long text written
 * as markdown, one file per document and language, like the tips.
 *
 * <p>Markdown rather than translation keys because these are documents, with headings, lists and
 * links, and a lawyer or the owner edits them as prose; a JSON string per paragraph would make
 * every change a hunt.</p>
 */
@Injectable({ providedIn: 'root' })
export class LegalDocumentsService {
  private readonly localizedMarkdownService = inject(LocalizedMarkdownService);
  private readonly imageVersionStore = inject(ImageVersionStore);
  private readonly publishedPlanLimitsStore = inject(PublishedPlanLimitsStore);

  /**
   * Fetches one document in the reader's language, or in English until it is translated, with
   * the operator's details and the Fair Use limits filled in.
   *
   * <p>Emits again, without fetching again, when the published limits arrive, so the Fair Use
   * Policy pre-rendered with the compiled numbers ends up showing the ones in force.</p>
   *
   * @param documentName which document
   * @param languageCode the reader's language
   * @returns the document as HTML, its {@code #} title the page's {@code <h1>}
   */
  loadRenderedLegalDocument(
    documentName: LegalDocumentName,
    languageCode: SupportedLanguageCode,
  ): Observable<string> {
    return combineLatest([
      this.localizedMarkdownService.loadMarkdown(
        LEGAL_CONTENT_ROOT,
        `${documentName}.md`,
        languageCode,
      ),
      this.publishedPlanLimitsStore.fairUseLimits$,
    ]).pipe(
      map(([loaded, fairUseLimits]) =>
        renderSiteMarkdown(fillLegalDocumentPlaceholders(loaded.markdown, fairUseLimits), {
          languageCode: loaded.languageCode,
          imageFolder: LEGAL_IMAGE_FOLDER,
          markdownFolder: `${LEGAL_CONTENT_ROOT}/${loaded.languageCode}`,
          versionImageUrl: this.imageVersionStore.versionImageUrl,
        }),
      ),
    );
  }
}

/**
 * Replaces every known {@code {placeholder}} in a document with its value.
 *
 * <p>An unknown one is left as written, so a typo shows on the page instead of vanishing.</p>
 *
 * @param markdown the document as written
 * @param fairUseLimits the Fair Use limits to print; the compiled ones unless told otherwise
 * @returns the document with the operator's details and the limits in place
 */
export function fillLegalDocumentPlaceholders(
  markdown: string,
  fairUseLimits: PlanLimits = COMPILED_PLAN_LIMITS.fairUse,
): string {
  const placeholders = {
    ...LEGAL_DOCUMENT_PLACEHOLDERS,
    ...fairUsePlaceholderValues(fairUseLimits),
  };
  return markdown.replace(
    /\{(\w+)\}/g,
    (placeholder, name: string) => placeholders[name] ?? placeholder,
  );
}
