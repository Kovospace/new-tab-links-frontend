import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PresentedPlanOffer } from '../plan-offers.view-model';

/**
 * One offer column: the plan's heading, what it gives, and the button under it.
 *
 * <p>Purely presentational, so it has no view-model of its own: everything it shows arrives
 * finished in {@link offer}, worded by {@code PlanOffersViewModel}. The three columns differ only
 * in that data and in their colours, which is why one component draws all three.</p>
 */
@Component({
  selector: 'app-plan-offer-card',
  imports: [RouterLink],
  templateUrl: './plan-offer-card.html',
  styleUrl: './plan-offer-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanOfferCard {
  /** The column to draw. */
  readonly offer = input.required<PresentedPlanOffer>();
}
