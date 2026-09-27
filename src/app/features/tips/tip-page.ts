import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TipPageViewModel } from './tip-page.view-model';

/**
 * One tip, rendered from its markdown file.
 *
 * <p>Nothing to start by hand: the view-model follows the address and the language on its own.</p>
 */
@Component({
  selector: 'app-tip-page',
  imports: [RouterLink, TranslatePipe],
  providers: [TipPageViewModel],
  templateUrl: './tip-page.html',
  styleUrl: './tip-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipPage {
  /** State of the tip page. */
  protected readonly viewModel = inject(TipPageViewModel);
}
