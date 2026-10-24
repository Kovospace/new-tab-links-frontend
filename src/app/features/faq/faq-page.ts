import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { FaqPageViewModel } from './faq-page.view-model';

/**
 * Frequently asked questions — what people want to know before installing, answered in one place
 * that search engines and AI answer engines can quote.
 *
 * <p>The questions are a markdown file per language; how they look is {@link RenderedMarkdown}'s.</p>
 */
@Component({
  selector: 'app-faq-page',
  imports: [TranslatePipe, RenderedMarkdown],
  providers: [FaqPageViewModel],
  templateUrl: './faq-page.html',
  styleUrl: './faq-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPage {
  /** State of the page. */
  protected readonly viewModel = inject(FaqPageViewModel);
}
