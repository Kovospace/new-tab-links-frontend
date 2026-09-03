import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { AdminLoginPageViewModel } from './admin-login-page.view-model';

/**
 * The operator's sign-in.
 *
 * <p>Reached at {@code /admin}, and linked from nowhere: the header does not offer it and the
 * sitemap does not list it. That is not the security measure — the backend's credentials are —
 * but there is no reason to advertise a door only one person is meant to use.</p>
 */
@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback],
  providers: [AdminLoginPageViewModel],
  templateUrl: './admin-login-page.html',
  styleUrl: './admin-login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginPage {
  /** State and behaviour of the operator sign-in form. */
  protected readonly viewModel = inject(AdminLoginPageViewModel);
}
