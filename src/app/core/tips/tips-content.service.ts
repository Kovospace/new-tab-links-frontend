import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { DEFAULT_LANGUAGE_CODE, SupportedLanguageCode } from '../i18n/supported-language';

/** Where the tips' markdown and its generated index are served from; they ship in {@code public/content/tips}. */
const TIPS_CONTENT_ROOT = '/content/tips';

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
export interface LoadedTipMarkdown {
  readonly markdown: string;
  /**
   * The language of the file that answered — the reader's, or English when the tip has not been
   * translated yet. The renderer needs it to find the right language's screenshots.
   */
  readonly languageCode: SupportedLanguageCode;
}

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
 * <p>Not {@code BackendApiClient}: these are static files of this site, like the translations,
 * not calls to the backend.</p>
 */
@Injectable({ providedIn: 'root' })
export class TipsContentService {
  private readonly httpClient = inject(HttpClient);

  /**
   * Fetches the list of every tip.
   *
   * @returns the tips by language
   */
  loadTipsIndex(): Observable<TipsIndex> {
    return this.httpClient.get<TipsIndex>(`${TIPS_CONTENT_ROOT}/index.json`);
  }

  /**
   * Fetches one tip's markdown in the reader's language, or in English when it is not translated.
   *
   * <p>A tip written in English first and translated later is the normal order of things, so an
   * untranslated tip is shown in English rather than as missing. Only a tip that exists in no
   * language fails, with {@link TipNotFoundError}.</p>
   *
   * @param slug the tip's address below {@code /tips}
   * @param languageCode the reader's language
   * @returns the markdown, and the language it came in
   */
  loadTipMarkdown(
    slug: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedTipMarkdown> {
    return this.fetchMarkdown(slug, languageCode).pipe(
      catchError((failure: unknown) =>
        isNotFound(failure) && languageCode !== DEFAULT_LANGUAGE_CODE
          ? this.fetchMarkdown(slug, DEFAULT_LANGUAGE_CODE)
          : throwError(() => failure),
      ),
      catchError((failure: unknown) =>
        throwError(() => (isNotFound(failure) ? new TipNotFoundError(slug) : failure)),
      ),
    );
  }

  /**
   * Fetches one language's file of a tip.
   *
   * @param slug the tip's address below {@code /tips}
   * @param languageCode the language whose file to fetch
   * @returns the markdown, and that language
   */
  private fetchMarkdown(
    slug: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedTipMarkdown> {
    return this.httpClient
      .get(`${TIPS_CONTENT_ROOT}/${languageCode}/${encodeURIComponent(slug)}.md`, {
        responseType: 'text',
      })
      .pipe(
        map((markdown) => {
          if (isApplicationShell(markdown)) {
            throw new HttpErrorResponse({ status: HttpStatusCode.NotFound });
          }
          return { markdown, languageCode };
        }),
      );
  }
}

/**
 * Whether a fetch answered with the application's own page instead of a markdown file.
 *
 * <p>The development server answers an unknown file with the HTML shell and a 200, where nginx
 * answers 404. Treated as missing, so that both behave alike and the shell is never rendered as a
 * tip.</p>
 *
 * @param body what the fetch answered with
 * @returns true for an HTML document
 */
function isApplicationShell(body: string): boolean {
  return /^\s*<!doctype html/i.test(body);
}

/**
 * Whether a failed fetch means the file is simply not there.
 *
 * @param failure whatever the fetch failed with
 * @returns true for a 404
 */
function isNotFound(failure: unknown): boolean {
  return failure instanceof HttpErrorResponse && failure.status === HttpStatusCode.NotFound;
}
