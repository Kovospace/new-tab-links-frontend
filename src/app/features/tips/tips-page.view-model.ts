import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../core/i18n/translation.service';
import { DEFAULT_LANGUAGE_CODE } from '../../core/i18n/supported-language';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';
import { TipsContentService, TipsIndex } from '../../core/tips/tips-content.service';

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
 */
@Injectable()
export class TipsPageViewModel {
  private readonly tipsContentService = inject(TipsContentService);
  private readonly translationService = inject(TranslationService);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  private readonly loadedIndex = signal<TipsIndex | null>(null);
  private readonly loadFailed = signal(false);

  /** Whether the list is still being fetched. */
  readonly isLoading = computed<boolean>(() => this.loadedIndex() === null && !this.loadFailed());

  /** The tips, in the reader's language where they exist, each with its link. */
  readonly presentedTips = computed<readonly PresentedTipLink[]>(() => {
    const index = this.loadedIndex() ?? {};
    const tips =
      index[this.translationService.currentLanguageCode()] ?? index[DEFAULT_LANGUAGE_CODE] ?? [];
    return tips.map((tip) => ({
      slug: tip.slug,
      title: tip.title,
      routerLink: this.localizedRouteLinks.tipLink(tip.slug),
    }));
  });

  /** Whether the list loaded and holds nothing, or could not be loaded at all. */
  readonly isEmpty = computed<boolean>(
    () => !this.isLoading() && this.presentedTips().length === 0,
  );

  /** Fetches the list of tips. */
  loadTips(): void {
    this.tipsContentService.loadTipsIndex().subscribe({
      next: (index) => this.loadedIndex.set(index),
      error: () => this.loadFailed.set(true),
    });
  }
}
