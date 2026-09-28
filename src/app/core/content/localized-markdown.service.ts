import { HttpClient, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { DEFAULT_LANGUAGE_CODE, SupportedLanguageCode } from '../i18n/supported-language';

/** A markdown file, and the language it was actually found in. */
export interface LoadedMarkdown {
  readonly markdown: string;
  /**
   * The language of the file that answered — the reader's, or English when the file has not been
   * translated yet. The renderer needs it to find the right language's images.
   */
  readonly languageCode: SupportedLanguageCode;
}

/** Thrown when a markdown file exists in no language at all. */
export class MarkdownNotFoundError extends Error {
  constructor(fileName: string) {
    super(`No markdown file is called "${fileName}".`);
    this.name = 'MarkdownNotFoundError';
  }
}

/**
 * The site's written content — tips, the home page's points — fetched as files the site ships,
 * one folder per language.
 *
 * <p>Not {@code BackendApiClient}: these are static files of this site, like the translations,
 * not calls to the backend.</p>
 */
@Injectable({ providedIn: 'root' })
export class LocalizedMarkdownService {
  private readonly httpClient = inject(HttpClient);

  /**
   * Fetches a generated index of a content folder.
   *
   * @param contentRoot the folder, e.g. {@code /content/tips}
   * @returns the index as the build script wrote it
   */
  loadIndex<Index>(contentRoot: string): Observable<Index> {
    return this.httpClient.get<Index>(`${contentRoot}/index.json`);
  }

  /**
   * Fetches one markdown file in the reader's language, or in English when it is not translated.
   *
   * <p>Content written in English first and translated later is the normal order of things, so an
   * untranslated file is shown in English rather than as missing. Only a file that exists in no
   * language fails, with {@link MarkdownNotFoundError}.</p>
   *
   * @param contentRoot the folder holding one subfolder per language, e.g. {@code /content/tips}
   * @param fileName the file's name within a language's folder
   * @param languageCode the reader's language
   * @returns the markdown, and the language it came in
   */
  loadMarkdown(
    contentRoot: string,
    fileName: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedMarkdown> {
    return this.fetchMarkdown(contentRoot, fileName, languageCode).pipe(
      catchError((failure: unknown) =>
        isNotFound(failure) && languageCode !== DEFAULT_LANGUAGE_CODE
          ? this.fetchMarkdown(contentRoot, fileName, DEFAULT_LANGUAGE_CODE)
          : throwError(() => failure),
      ),
      catchError((failure: unknown) =>
        throwError(() => (isNotFound(failure) ? new MarkdownNotFoundError(fileName) : failure)),
      ),
    );
  }

  /**
   * Fetches one language's copy of a file.
   *
   * @param contentRoot the folder holding one subfolder per language
   * @param fileName the file's name within a language's folder
   * @param languageCode the language whose copy to fetch
   * @returns the markdown, and that language
   */
  private fetchMarkdown(
    contentRoot: string,
    fileName: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedMarkdown> {
    return this.httpClient
      .get(`${contentRoot}/${languageCode}/${encodeURIComponent(fileName)}`, {
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
 * answers 404. Treated as missing, so that both behave alike and the shell is never rendered as
 * content.</p>
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
