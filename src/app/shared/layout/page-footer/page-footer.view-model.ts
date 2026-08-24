import { Injectable, computed, inject } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';

/** The author's own website, linked from the footer. */
const AUTHOR_WEBSITE_URL = 'https://kovo.space';

/**
 * State behind the footer.
 *
 * <p>The copyright line is assembled here rather than in the template: it joins a translated
 * sentence, the author's name and the current year, and the project's rule is that a template
 * binds finished text.</p>
 */
@Injectable()
export class PageFooterViewModel {
  private readonly translationService = inject(TranslationService);

  /** Where the author's name links to. */
  readonly authorWebsiteUrl = AUTHOR_WEBSITE_URL;

  /** Label shown for the author's website. */
  readonly authorWebsiteLabel = computed<string>(() =>
    this.translationService.translate('footer.authorSiteLabel'),
  );

  /**
   * The finished copyright line, for example {@code © 2026 Matej Kovacs}.
   *
   * <p>The year is read at render time rather than hard-coded, so the footer never goes stale.</p>
   */
  readonly copyrightNotice = computed<string>(() =>
    this.translationService.translate('footer.copyrightNotice', {
      year: new Date().getFullYear(),
      author: this.translationService.translate('footer.authorName'),
    }),
  );
}
