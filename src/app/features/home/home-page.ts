import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DemoSlideshow } from './demo-slideshow/demo-slideshow';
import { HomePageViewModel } from './home-page.view-model';

/**
 * The landing page: what the extension is and why anyone would want it.
 *
 * <p>The three offers at the bottom are tailored to a signed-in visitor: what they can still buy
 * links to the purchase form, and what they already have says so instead.</p>
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe, DemoSlideshow],
  providers: [HomePageViewModel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  /** State of the home page. */
  protected readonly viewModel = inject(HomePageViewModel);

  /**
   * Finds out where a signed-in visitor stands, so the offers can say so.
   */
  ngOnInit(): void {
    this.viewModel.loadPremiumStanding();
  }
}
