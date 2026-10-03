import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { BackButton } from '../../shared/layout/back-button/back-button';
import { LegalTextPageViewModel } from './legal-text-page.view-model';

/**
 * A legal document — the privacy policy, the terms, the refund policy or the cookie statement.
 *
 * <p>Which document it shows comes from the route, so adding a fifth is a route entry and a
 * markdown file per language, with no new component.</p>
 *
 * <p>How the document looks is {@link RenderedMarkdown}'s; this page only sets the
 * {@code --markdown-*} custom properties where a legal text reads better spaced differently.</p>
 */
@Component({
  selector: 'app-legal-text-page',
  imports: [BackButton, TranslatePipe, RenderedMarkdown],
  providers: [LegalTextPageViewModel],
  templateUrl: './legal-text-page.html',
  styleUrl: './legal-text-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalTextPage {
  /** State of the page. */
  protected readonly viewModel = inject(LegalTextPageViewModel);
}
