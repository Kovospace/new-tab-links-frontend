import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CurrencySwitcherViewModel } from './currency-switcher.view-model';

/**
 * Lets the reader choose the currency prices are shown and paid in.
 *
 * <p>A {@code <select>} rather than a row of buttons like the language flags: there are two
 * currencies today, and the payment provider plans to add national ones, which a dropdown takes
 * without growing.</p>
 *
 * <p>Every instance drives the same site-wide choice, so the header's picker and the one in the
 * premium form always agree.</p>
 */
@Component({
  selector: 'app-currency-switcher',
  imports: [TranslatePipe],
  providers: [CurrencySwitcherViewModel],
  templateUrl: './currency-switcher.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurrencySwitcher {
  /** State and behaviour of the picker. */
  protected readonly viewModel = inject(CurrencySwitcherViewModel);
}
