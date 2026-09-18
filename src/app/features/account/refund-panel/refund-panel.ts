import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { RefundPanelViewModel } from './refund-panel.view-model';

/**
 * Withdrawing from a purchase within the 14-day window.
 *
 * <p>Rendered only while the backend says the purchase is still refundable. Whether it is, is the
 * backend's to decide: the deadline is a date comparison, and this side's clock belongs to the
 * user.</p>
 */
@Component({
  selector: 'app-refund-panel',
  imports: [TranslatePipe, FormFeedback],
  providers: [RefundPanelViewModel],
  templateUrl: './refund-panel.html',
  styleUrl: './refund-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RefundPanel {
  /** When the refund window closes, as the account page loaded it. */
  readonly refundableUntil = input.required<string | null>();

  /** State and behaviour of the withdrawal. */
  protected readonly viewModel = inject(RefundPanelViewModel);

  /**
   * Keeps the view-model's deadline in step with the loaded subscription.
   *
   * <p>An effect rather than a one-off, because the parent page fills the deadline in only once
   * the subscription has been fetched, which is after this panel first renders.</p>
   */
  private readonly passDeadlineToViewModel = effect(() =>
    this.viewModel.acceptRefundWindow(this.refundableUntil()),
  );
}
