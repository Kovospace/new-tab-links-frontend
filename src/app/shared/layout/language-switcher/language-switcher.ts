import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageSwitcherViewModel } from './language-switcher.view-model';

/**
 * Lets the reader choose the language the site is displayed in.
 *
 * <p>The choice is remembered, so a return visit opens in the same language.</p>
 *
 * <p>Shown as one flag per language. Each is a button carrying the language's name as its
 * accessible name, because a flag is a picture of a country rather than of a language and cannot
 * name the control on its own.</p>
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
}
