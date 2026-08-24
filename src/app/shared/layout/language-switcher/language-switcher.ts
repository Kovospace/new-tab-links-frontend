import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SupportedLanguageCode } from '../../../core/i18n/supported-language';
import { LanguageSwitcherViewModel } from './language-switcher.view-model';

/**
 * Lets the reader choose the language the site is displayed in.
 *
 * <p>The choice is remembered, so a return visit opens in the same language.</p>
 */
@Component({
  selector: 'app-language-switcher',
  providers: [LanguageSwitcherViewModel],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  /** State and behaviour of the switcher. */
  protected readonly viewModel = inject(LanguageSwitcherViewModel);

  /**
   * Passes the reader's choice on to the view-model.
   *
   * <p>Exists only to narrow the raw {@code <select>} value to a supported language code, which
   * is a job for the component boundary rather than for the template or the view-model.</p>
   *
   * @param changeEvent the select's change event
   */
  protected onLanguageSelected(changeEvent: Event): void {
    const selectedLanguageCode = (changeEvent.target as HTMLSelectElement)
      .value as SupportedLanguageCode;

    this.viewModel.changeLanguage(selectedLanguageCode);
  }
}
