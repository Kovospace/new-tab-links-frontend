import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlanOfferCard } from './plan-offer-card/plan-offer-card';
import { PlanOffersViewModel } from './plan-offers.view-model';

/**
 * The three offers at the bottom of the home page, and the Fair Use note under them.
 *
 * <p>Tailored to a signed-in visitor: what they can still buy links to the purchase form, and what
 * they already have says so instead.</p>
 */
@Component({
  selector: 'app-plan-offers',
  imports: [RouterLink, TranslatePipe, PlanOfferCard],
  providers: [PlanOffersViewModel],
  templateUrl: './plan-offers.html',
  styleUrl: './plan-offers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanOffers implements OnInit {
  /** State of the offers. */
  protected readonly viewModel = inject(PlanOffersViewModel);

  /** Finds out where a signed-in visitor stands, so the offers can say so. */
  ngOnInit(): void {
    this.viewModel.loadPremiumStanding();
  }
}
