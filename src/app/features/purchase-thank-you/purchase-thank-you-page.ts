import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { PurchaseThankYouPageViewModel } from './purchase-thank-you-page.view-model';

/**
 * The page a buyer returns to from the payment provider: thanks, and whether the full version has
 * reached the account yet.
 */
@Component({
  selector: 'app-purchase-thank-you-page',
  imports: [RouterLink, TranslatePipe],
  providers: [PurchaseThankYouPageViewModel],
  templateUrl: './purchase-thank-you-page.html',
  styleUrl: './purchase-thank-you-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseThankYouPage implements OnInit {
  /** State of the thank-you page. */
  protected readonly viewModel = inject(PurchaseThankYouPageViewModel);

  /** The routes the page links on to. */
  protected readonly links = APPLICATION_ROUTE_LINKS;

  /**
   * Starts confirming the purchase as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.confirmPurchase();
  }
}
