import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { PageHeaderViewModel } from './page-header.view-model';

/**
 * The top bar: the site title, the navigation, and the language switcher.
 *
 * <p>Rendered once by the application shell and shared by every page.</p>
 *
 * <p>Below a narrow width the same markup collapses behind one button, the navigation and the
 * language switcher moving inside it. Which layout applies is decided entirely by the stylesheet;
 * nothing here measures the viewport, so there is no width duplicated between CSS and TypeScript
 * and no resize listener to keep in step.</p>
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LanguageSwitcher],
  providers: [PageHeaderViewModel],
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Escape closes the open menu, which is what a keyboard user expects of anything that
    // covers the page. Harmless when it is already closed, and on a wide screen.
    '(document:keydown.escape)': 'viewModel.closeMobileMenu()',
  },
})
export class PageHeader {
  /** State and behaviour of the top bar. */
  protected readonly viewModel = inject(PageHeaderViewModel);

  /** Where the site title links back to. */
  protected readonly homeLink = APPLICATION_ROUTE_LINKS.home;
}
