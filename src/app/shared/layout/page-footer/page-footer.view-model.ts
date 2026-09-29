import { Injectable, computed, inject } from '@angular/core';
import { TranslationService } from '../../../core/i18n/translation.service';
import { LEGAL_OPERATOR } from '../../../core/legal/legal-operator';

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

  /**
   * The support address, shown on every page: the payment provider requires a reachable one to be
   * visible on the site, and a buyer looking for help should not have to find the right page.
   */
  readonly supportEmailAddress = LEGAL_OPERATOR.supportEmail;

  /** The support address as a link that opens the reader's mail program. */
  readonly supportEmailHref = `mailto:${LEGAL_OPERATOR.supportEmail}`;

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
