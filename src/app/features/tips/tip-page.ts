import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TipPageViewModel } from './tip-page.view-model';

/**
 * One tip, rendered from its markdown file.
 *
 * <p>Nothing to start by hand: the view-model follows the address and the language on its own.</p>
 *
 * <p><strong>Its styles are not encapsulated, on purpose.</strong> Angular scopes a component's
 * rules by stamping an attribute on every element of its template and adding it to every selector
 * — and the tip's own HTML arrives through {@code [innerHTML]}, which never gets the stamp. A rule
 * for {@code .tip ol} would compile to {@code .tip[_ngcontent-…] ol[_ngcontent-…]} and match
 * nothing the markdown produced. So the stylesheet is global, and every rule in it must stay
 * nested under {@code .tip}, the one class that keeps it from styling the rest of the site.</p>
 */
@Component({
  selector: 'app-tip-page',
  imports: [RouterLink, TranslatePipe],
  providers: [TipPageViewModel],
  templateUrl: './tip-page.html',
  styleUrl: './tip-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TipPage {
  /** State of the tip page. */
  protected readonly viewModel = inject(TipPageViewModel);
}
