import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  LoadedMarkdown,
  LocalizedMarkdownService,
  MarkdownNotFoundError,
} from '../content/localized-markdown.service';
import { SupportedLanguageCode } from '../i18n/supported-language';

/** Where the releases' markdown and its generated index are served from; they ship in {@code public/content/changelog}. */
export const CHANGELOG_CONTENT_ROOT = '/content/changelog';

/** One release as the list shows it — the beginning every release's markdown must have. */
export interface ReleaseSummary {
  /** The version, which is also the markdown file's name and the release's address. */
  readonly version: string;
  /** The day it went out, ISO 8601 ({@code 2026-10-08}), entered by hand once the store approved it. */
  readonly releasedOn: string;
  /** The bullets under the release's "most important changes" heading, as plain text. */
  readonly highlights: readonly string[];
}

/**
 * Every release, by language, newest version first.
 *
 * <p>Generated at build time by {@code scripts/build-changelog-index.mjs}, which also refuses a
 * release whose markdown does not begin in the mandatory way. A language with no releases written
 * is absent rather than empty.</p>
 */
export type ChangelogIndex = Partial<Record<string, readonly ReleaseSummary[]>>;

/** Thrown when a release exists in no language at all. */
export class ReleaseNotFoundError extends Error {
  constructor(version: string) {
    super(`No release is called "${version}".`);
    this.name = 'ReleaseNotFoundError';
  }
}

/**
 * The changelog's written content: one markdown file per released version and language.
 *
 * <p>The fetching, with its English fallback, is {@link LocalizedMarkdownService}'s; this adds where
 * releases live and names a missing one as a missing release.</p>
 */
@Injectable({ providedIn: 'root' })
export class ChangelogContentService {
  private readonly localizedMarkdownService = inject(LocalizedMarkdownService);

  /**
   * Fetches the list of every release.
   *
   * @returns the releases by language
   */
  loadChangelogIndex(): Observable<ChangelogIndex> {
    return this.localizedMarkdownService.loadIndex<ChangelogIndex>(CHANGELOG_CONTENT_ROOT);
  }

  /**
   * Fetches one release's markdown in the reader's language, or in English until it is translated.
   *
   * @param version the release's version
   * @param languageCode the reader's language
   * @returns the markdown, and the language it came in
   */
  loadReleaseMarkdown(
    version: string,
    languageCode: SupportedLanguageCode,
  ): Observable<LoadedMarkdown> {
    return this.localizedMarkdownService
      .loadMarkdown(CHANGELOG_CONTENT_ROOT, `${version}.md`, languageCode)
      .pipe(
        catchError((failure: unknown) =>
          throwError(() =>
            failure instanceof MarkdownNotFoundError ? new ReleaseNotFoundError(version) : failure,
          ),
        ),
      );
  }
}
