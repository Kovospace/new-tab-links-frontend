import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { DeleteAccountPanelViewModel } from './delete-account-panel.view-model';

/**
 * Deleting the account and everything it owns.
 */
@Component({
  selector: 'app-delete-account-panel',
  imports: [TranslatePipe],
  providers: [DeleteAccountPanelViewModel],
  templateUrl: './delete-account-panel.html',
  styleUrl: './delete-account-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAccountPanel {
  /** State and behaviour of the deletion flow. */
  protected readonly viewModel = inject(DeleteAccountPanelViewModel);
}
