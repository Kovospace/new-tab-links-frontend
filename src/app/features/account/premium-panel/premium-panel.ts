import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { PremiumPlan } from '../../../core/api/models/subscription.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { LegalConsentNotice } from '../../../shared/legal/legal-consent-notice/legal-consent-notice';
import { PremiumPanelViewModel } from './premium-panel.view-model';

/**
 * Buying a premium subscription: where the buyer is, which plan, and off to the payment gate.
 *
 * <p>Rendered only for an account that still has something to buy, and offering only that: both
 * plans to a free account, lifetime alone to a subscriber. The account page decides both, because
 * it is the one holding the subscription status.</p>
 */
@Component({
  selector: 'app-premium-panel',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback, LegalConsentNotice],
  providers: [PremiumPanelViewModel],
  templateUrl: './premium-panel.html',
  styleUrl: './premium-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumPanel {
  /** The plans the account can buy, in the order they are offered. */
  readonly purchasablePlans = input.required<readonly PremiumPlan[]>();

  /** The plan to choose before the reader does, or {@code null} for the form's own default. */
  readonly preselectedPlan = input<PremiumPlan | null>(null);

  /** State and behaviour of the purchase form. */
  protected readonly viewModel = inject(PremiumPanelViewModel);

  /**
   * Keeps the offered plans, and the choice among them, in step with the page.
   *
   * <p>An effect rather than a one-off, because the page knows what the account can buy only once
   * the account and its subscription have loaded.</p>
   */
  private readonly offerThePurchasablePlans = effect(() =>
    this.viewModel.offerPlans(this.purchasablePlans(), this.preselectedPlan()),
  );
}
