import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { LegalConsentNotice } from '../../shared/legal/legal-consent-notice/legal-consent-notice';
import { RegisterPageViewModel } from './register-page.view-model';

/**
 * Creating an account: with a password, or through Google.
 */
@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormFeedback, LegalConsentNotice],
  providers: [RegisterPageViewModel],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  /** State and behaviour of the registration form. */
  protected readonly viewModel = inject(RegisterPageViewModel);

  /** Where someone who already has an account is sent. */
  protected readonly loginLink = APPLICATION_ROUTE_LINKS.login;
}
