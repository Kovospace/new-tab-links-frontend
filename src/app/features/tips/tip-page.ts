import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { TipPageViewModel } from './tip-page.view-model';

/**
 * One tip, rendered from its markdown file.
 *
 * <p>Nothing to start by hand: the view-model follows the address and the language on its own.</p>
 *
 * <p>How the tip's own HTML looks is {@link RenderedMarkdown}'s; this page only adjusts it through
 * the {@code --markdown-*} custom properties, should it ever need to differ.</p>
 */
@Component({
  selector: 'app-tip-page',
  imports: [RouterLink, TranslatePipe, RenderedMarkdown],
  providers: [TipPageViewModel],
  templateUrl: './tip-page.html',
  styleUrl: './tip-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipPage {
  /** State of the tip page. */
  protected readonly viewModel = inject(TipPageViewModel);
}
