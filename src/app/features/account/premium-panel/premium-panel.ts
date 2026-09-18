import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { PremiumPanelViewModel } from './premium-panel.view-model';

/**
 * Buying a premium subscription: where the buyer is, which plan, and off to the payment gate.
 *
 * <p>Rendered only for an account that is not premium; the account page decides that, because it
 * is the one holding the subscription status.</p>
 */
@Component({
  selector: 'app-premium-panel',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback],
  providers: [PremiumPanelViewModel],
  templateUrl: './premium-panel.html',
  styleUrl: './premium-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PremiumPanel {
  /** State and behaviour of the purchase form. */
  protected readonly viewModel = inject(PremiumPanelViewModel);
}
