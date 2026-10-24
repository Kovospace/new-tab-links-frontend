import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import { DEFAULT_LANGUAGE_CODE } from '../../core/i18n/supported-language';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';
import { TipsContentService, TipsIndex, TipSummary } from '../../core/tips/tips-content.service';
import { tipMatchesSearch } from '../../core/tips/tip-search';

/** One tip as the list renders it. */
export interface PresentedTipLink {
  readonly slug: string;
  readonly title: string;
  /** The tip's own page. */
  readonly routerLink: string;
}

/**
 * State behind the list of every tip.
 *
 * <p>The list follows the reader's language, and falls back to the English list for a language
 * that has no tips written yet — an empty page in Slovak while twenty tips exist in English would
 * be the worse answer.</p>
 *
 * <p>The search runs entirely in the browser, over the plain text the build wrote into the index,
 * so it filters as the reader types without a request per keystroke.</p>
 */
@Injectable()
export class TipsPageViewModel {
  private readonly tipsContentService = inject(TipsContentService);
  private readonly translationService = inject(TranslationService);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  private readonly loadedIndex = signal<TipsIndex | null>(null);
  private readonly loadFailed = signal(false);

  /** What the reader typed into the search, as typed. */
  readonly searchQuery = signal('');

  /** Whether the list is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.loadedIndex() === null && !this.loadFailed());

  /** Every tip in the reader's language where they exist, before the search filters any out. */
  private readonly tipsInReaderLanguage = computed<readonly TipSummary[]>(() => {
    const index = this.loadedIndex() ?? {};
    return (
      index[this.translationService.currentLanguageCode()] ?? index[DEFAULT_LANGUAGE_CODE] ?? []
    );
  });

  /** The tips matching the search, in the reader's language where they exist, each with its link. */
  readonly presentedTips = computed<readonly PresentedTipLink[]>(() =>
    this.tipsInReaderLanguage()
      .filter((tip) => tipMatchesSearch(tip, this.searchQuery()))
      .map((tip) => ({
        slug: tip.slug,
        title: tip.title,
        routerLink: this.localizedRouteLinks.tipLink(tip.slug),
      })),
  );

  /** Whether the list loaded and holds nothing, or could not be loaded at all. */
  readonly isEmpty = computed<boolean>(
    () => !this.isLoading() && this.tipsInReaderLanguage().length === 0,
  );

  /** Whether tips exist but none of them matches the search. */
  readonly hasNoSearchMatches = computed<boolean>(
    () => !this.isEmpty() && !this.isLoading() && this.presentedTips().length === 0,
  );

  /**
   * Narrows the list to the tips matching what the reader typed.
   *
   * @param searchQuery the search field's current value
   */
  searchTips(searchQuery: string): void {
    this.searchQuery.set(searchQuery);
  }

  /** Fetches the list of tips. */
  loadTips(): void {
    this.tipsContentService.loadTipsIndex().subscribe({
      next: (index) => this.loadedIndex.set(index),
      error: () => this.loadFailed.set(true),
    });
  }
}
