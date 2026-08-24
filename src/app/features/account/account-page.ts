import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AccountPageViewModel } from './account-page.view-model';
import { DeleteAccountPanel } from './delete-account-panel/delete-account-panel';
import { PasswordPanel } from './password-panel/password-panel';
import { ProfilePanel } from './profile-panel/profile-panel';

/**
 * Managing the account: what it is, what can be changed, and how to be rid of it.
 *
 * <p>The page loads the account once and hands the parts each panel needs down as inputs, so the
 * three panels never fetch it again between them.</p>
 */
@Component({
  selector: 'app-account-page',
  imports: [TranslatePipe, ProfilePanel, PasswordPanel, DeleteAccountPanel],
  providers: [AccountPageViewModel],
  templateUrl: './account-page.html',
  styleUrl: './account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage implements OnInit {
  /** State of the account page. */
  protected readonly viewModel = inject(AccountPageViewModel);

  /**
   * Fetches the account as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.loadAccount();
  }
}
