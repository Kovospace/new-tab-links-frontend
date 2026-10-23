import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { HomePageViewModel } from './home-page.view-model';
import { PlanOffers } from './plan-offers/plan-offers';
import { ThemeShowcase } from './theme-showcase/theme-showcase';

/**
 * The landing page: what the extension is and why anyone would want it.
 *
 * <p>Four parts: the headline with its two calls to action, the light-and-dark comparison, the
 * selling points, and the offers - the comparison and the offers components of their own.</p>
 *
 * <p>The demo slideshow ({@code demo-slideshow/}) is switched off, not deleted: the comparison
 * took its place, and putting it back is one element in the template.</p>
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe, ThemeShowcase, RenderedMarkdown, PlanOffers],
  providers: [HomePageViewModel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  /** State of the home page. */
  protected readonly viewModel = inject(HomePageViewModel);
}
