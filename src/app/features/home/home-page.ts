import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { DemoSlideshow } from './demo-slideshow/demo-slideshow';
import { HomePageViewModel } from './home-page.view-model';
import { PlanOffers } from './plan-offers/plan-offers';

/**
 * The landing page: what the extension is and why anyone would want it.
 *
 * <p>Three parts: the demo slideshow, the selling points, and the offers - the first and the last
 * components of their own.</p>
 */
@Component({
  selector: 'app-home-page',
  imports: [TranslatePipe, DemoSlideshow, RenderedMarkdown, PlanOffers],
  providers: [HomePageViewModel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  /** State of the home page. */
  protected readonly viewModel = inject(HomePageViewModel);
}
