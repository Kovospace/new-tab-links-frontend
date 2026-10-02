import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { LocalizedRouteLinks } from '../../../core/routing/localized-route-links';
import { PageFooterViewModel } from './page-footer.view-model';

/**
 * The bottom bar: the legal documents, the sitemap, the support address, and who made this.
 *
 * <p>Rendered once by the application shell and shared by every page.</p>
 */
@Component({
  selector: 'app-page-footer',
  imports: [RouterLink, TranslatePipe],
  providers: [PageFooterViewModel],
  templateUrl: './page-footer.html',
  styleUrl: './page-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageFooter {
  /** State of the footer. */
  protected readonly viewModel = inject(PageFooterViewModel);

  /** The pages the footer links to. */
  protected readonly routeLinks = inject(LocalizedRouteLinks).links;
}
