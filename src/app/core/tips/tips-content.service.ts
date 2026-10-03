import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  LoadedMarkdown,
  LocalizedMarkdownService,
  MarkdownNotFoundError,
} from '../content/localized-markdown.service';
import { SupportedLanguageCode } from '../i18n/supported-language';

/** Where the tips' markdown and its generated index are served from; they ship in {@code public/content/tips}. */
export const TIPS_CONTENT_ROOT = '/content/tips';

/** One tip as the list names it. */
export interface TipSummary {
  /** The tip's address below {@code /tips}, which is its markdown file's name. */
  readonly slug: string;
  /** The markdown's first heading. */
  readonly title: string;
}

/**
 * Every tip, by language.
 *
 * <p>Generated at build time by {@code scripts/build-tips-index.mjs}, because a static site cannot
 * list a folder. A language with no tips at all is absent rather than empty.</p>
 */
export type TipsIndex = Partial<Record<string, readonly TipSummary[]>>;

/** A tip's markdown, and the language it was actually found in. */
export type LoadedTipMarkdown = LoadedMarkdown;

/** Thrown when a tip exists in no language at all. */
export class TipNotFoundError extends Error {
  constructor(slug: string) {
    super(`No tip is called "${slug}".`);
    this.name = 'TipNotFoundError';
  }
}

/**
 * The tips' written content, fetched as files the site ships.
 *
 * <p>The fetching itself, with its English fallback, is {@link LocalizedMarkdownService}'s; this
 * adds where tips live and names a missing one as a missing tip.</p>
 */
@Injectable({ providedIn: 'root' })
export class TipsContentService {
  private readonly localizedMarkdownService = inject(LocalizedMarkdownService);

  /**
   * Fetches the list of every tip.
   *
   * @returns the tips by language
   */
  loadTipsIndex(): Observable<TipsIndex> {
    return this.localizedMarkdownService.loadIndex<TipsIndex>(TIPS_CONTENT_ROOT);
  }

  /**
   * Fetches one tip's markdown in the reader's language, or in English when it is not translated.
   *
   * <p>Only a tip that exists in no language fails, with {@link TipNotFoundError}.</p>
   *
   * @param slug the tip's address below {@code /tips}
   * @param languageCode the reader's language
   * @returns the markdown, and the language it came in
   */
  loadTipMarkdown(
    slug: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedTipMarkdown> {
    return this.localizedMarkdownService
      .loadMarkdown(TIPS_CONTENT_ROOT, `${slug}.md`, languageCode)
      .pipe(
        catchError((failure: unknown) =>
          throwError(() =>
            failure instanceof MarkdownNotFoundError ? new TipNotFoundError(slug) : failure,
          ),
        ),
      );
  }
}
