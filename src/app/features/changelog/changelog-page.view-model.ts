import { Injectable, computed, inject, signal } from '@angular/core';
import {
  ChangelogContentService,
  ChangelogIndex,
  ReleaseSummary,
} from '../../core/changelog/changelog-content.service';
import { DEFAULT_LANGUAGE_CODE } from '../../core/i18n/supported-language';
import { TranslationService } from '../../core/i18n/translation.service';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';
import { FORMATTING_LOCALES } from '../../shared/formatting/instant-formatter';

/** One release as the list renders it. */
export interface PresentedRelease {
  readonly version: string;
  /** Such as {@code Released 8 October 2026}, in the reader's language. */
  readonly releasedOnLine: string;
  /** The most important changes, one bullet each. */
  readonly highlights: readonly string[];
  /** The release's own page. */
  readonly routerLink: string;
}

/**
 * State behind the list of every release.
 *
 * <p>Release notes are written in English first and translated later, so the list is merged per
 * version: each release in the reader's language where it is translated, in English where it is
 * not yet. Falling back for the whole list instead would hide the newest release from a Slovak
 * reader until its translation lands.</p>
 */
@Injectable()
export class ChangelogPageViewModel {
  private readonly changelogContentService = inject(ChangelogContentService);
  private readonly translationService = inject(TranslationService);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  private readonly loadedIndex = signal<ChangelogIndex | null>(null);
  private readonly loadFailed = signal(false);

  /** Whether the list is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.loadedIndex() === null && !this.loadFailed());

  /** Every release, newest first, in the reader's language where it is translated. */
  readonly presentedReleases = computed<readonly PresentedRelease[]>(() =>
    mergeReleasesByVersion(
      this.loadedIndex() ?? {},
      this.translationService.currentLanguageCode(),
    ).map((release) => ({
      version: release.version,
      releasedOnLine: this.translationService.translate('changelog.releasedOn', {
        date: this.formatReleaseDate(release.releasedOn),
      }),
      highlights: release.highlights,
      routerLink: this.localizedRouteLinks.releaseLink(release.version),
    })),
  );

  /** Whether the list loaded and holds nothing, or could not be loaded at all. */
  readonly isEmpty = computed<boolean>(
    () => !this.isLoading() && this.presentedReleases().length === 0,
  );

  /** Fetches the list of releases. */
  loadReleases(): void {
    this.changelogContentService.loadChangelogIndex().subscribe({
      next: (index) => this.loadedIndex.set(index),
      error: () => this.loadFailed.set(true),
    });
  }

  /**
   * Spells a release date as a calendar date in the reader's language.
   *
   * <p>Formatted in UTC: the date is a calendar day, not an instant, and a reader west of
   * Greenwich would otherwise see the day before.</p>
   *
   * @param releasedOn the date, ISO 8601
   * @returns such as {@code 8 October 2026}
   */
  private formatReleaseDate(releasedOn: string): string {
    return new Intl.DateTimeFormat(
      FORMATTING_LOCALES[this.translationService.currentLanguageCode()],
      { dateStyle: 'long', timeZone: 'UTC' },
    ).format(new Date(releasedOn));
  }
}

/**
 * Every release once, each in the reader's language where it exists and in English otherwise,
 * newest version first.
 *
 * @param index the releases by language, each list newest first
 * @param languageCode the reader's language
 * @returns the merged list
 */
export function mergeReleasesByVersion(
  index: ChangelogIndex,
  languageCode: string,
): readonly ReleaseSummary[] {
  const readerReleases = index[languageCode] ?? [];
  const englishReleases = index[DEFAULT_LANGUAGE_CODE] ?? [];
  const translatedVersions = new Set(readerReleases.map((release) => release.version));
  const untranslatedReleases = englishReleases.filter(
    (release) => !translatedVersions.has(release.version),
  );
  return [...readerReleases, ...untranslatedReleases].sort(compareVersionsNewestFirst);
}

/**
 * Orders two releases newest version first, comparing the numbers of {@code 0.10.0} as numbers so
 * that it comes before {@code 0.9.0}. The build script orders each language's list the same way.
 *
 * @param first one release
 * @param second the other
 * @returns negative when the first is newer
 */
function compareVersionsNewestFirst(first: ReleaseSummary, second: ReleaseSummary): number {
  const firstParts = first.version.split(/[.-]/);
  const secondParts = second.version.split(/[.-]/);
  for (let index = 0; index < Math.max(firstParts.length, secondParts.length); index++) {
    const difference = (Number(secondParts[index]) || 0) - (Number(firstParts[index]) || 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return second.version.localeCompare(first.version);
}
