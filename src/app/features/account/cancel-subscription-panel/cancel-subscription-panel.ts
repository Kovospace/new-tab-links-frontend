import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { CancelSubscriptionPanelViewModel } from './cancel-subscription-panel.view-model';

/**
 * Ending a renewing subscription.
 *
 * <p>Rendered only when the backend says the subscription can be cancelled — which a lifetime
 * purchase never can, having nothing to renew. The account page decides that, from the
 * {@code cancellable} flag the backend computes.</p>
 */
@Component({
  selector: 'app-cancel-subscription-panel',
  imports: [TranslatePipe, FormFeedback],
  providers: [CancelSubscriptionPanelViewModel],
  templateUrl: './cancel-subscription-panel.html',
  styleUrl: './cancel-subscription-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelSubscriptionPanel {
  /** State and behaviour of the cancellation. */
  protected readonly viewModel = inject(CancelSubscriptionPanelViewModel);
}
