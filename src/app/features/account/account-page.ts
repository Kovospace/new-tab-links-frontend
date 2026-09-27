import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  afterRenderEffect,
  inject,
} from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AccountPageViewModel } from './account-page.view-model';
import { CancelSubscriptionPanel } from './cancel-subscription-panel/cancel-subscription-panel';
import { DeleteAccountPanel } from './delete-account-panel/delete-account-panel';
import { PasswordPanel } from './password-panel/password-panel';
import { PremiumPanel } from './premium-panel/premium-panel';
import { RefundPanel } from './refund-panel/refund-panel';
import { ProfilePanel } from './profile-panel/profile-panel';

/**
 * Managing the account: what it is, what can be changed, and how to be rid of it.
 *
 * <p>The page loads the account once and hands the parts each panel needs down as inputs, so the
 * panels never fetch it again between them. It also loads the premium standing, which decides
 * whether the purchase form or the cancellation is offered — and neither, for an account that is
 * premium for life and so has nothing to buy and nothing to renew.</p>
 */
@Component({
  selector: 'app-account-page',
  imports: [
    TranslatePipe,
    ProfilePanel,
    PremiumPanel,
    RefundPanel,
    CancelSubscriptionPanel,
    PasswordPanel,
    DeleteAccountPanel,
  ],
  providers: [AccountPageViewModel],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage implements OnInit {
  /** State of the account page. */
  protected readonly viewModel = inject(AccountPageViewModel);

  /** The purchase form's element id, which a link asking for a plan scrolls to. */
  protected readonly premiumPanelAnchor = 'premium';

  private readonly viewportScroller = inject(ViewportScroller);

  /** Whether the purchase form has been scrolled to, so it happens once and not on every render. */
  private hasRevealedPremiumPanel = false;

  /**
   * Scrolls to the purchase form once it has rendered, when the page was opened to buy.
   *
   * <p>After render, not on navigation: the form appears only once the account has loaded, which
   * is well after the router would have looked for it — so a plain URL fragment finds nothing.</p>
   */
  private readonly revealPremiumPanelOnceRendered = afterRenderEffect(() => {
    if (this.hasRevealedPremiumPanel || !this.viewModel.shouldRevealPremiumPanel()) {
      return;
    }
    this.hasRevealedPremiumPanel = true;
    this.viewportScroller.scrollToAnchor(this.premiumPanelAnchor);
  });

  /**
   * Fetches the account as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.loadAccount();
  }
}
