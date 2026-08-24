import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { PasswordPanelViewModel } from './password-panel.view-model';

/**
 * Setting a first password, or changing an existing one.
 */
@Component({
  selector: 'app-password-panel',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback],
  providers: [PasswordPanelViewModel],
  templateUrl: './password-panel.html',
  styleUrl: './password-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordPanel {
  /** Whether the account already has a password, as the parent page loaded it. */
  readonly accountHasPassword = input.required<boolean>();

  /** State and behaviour of the password form. */
  protected readonly viewModel = inject(PasswordPanelViewModel);

  /**
   * Configures the form once the parent page knows whether there is a password to prove.
   */
  private readonly configureWhenAccountArrives = effect(() =>
    this.viewModel.configureForAccount(this.accountHasPassword()),
  );
}
