import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PageHeaderViewModel } from './page-header.view-model';

/**
 * The top bar: the language switcher, the navigation, and who is signed in.
 *
 * <p>Rendered once by the application shell and shared by every page.</p>
 *
 * <p>One row on a wide screen, one column on a narrow one, and nothing in between: the stylesheet
 * alone decides, so there is no menu button, no open state and no width measured here.</p>
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcher],
  providers: [PageHeaderViewModel],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  /** State and behaviour of the top bar. */
  protected readonly viewModel = inject(PageHeaderViewModel);
}
