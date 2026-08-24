import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { ResetPasswordPageViewModel } from './reset-password-page.view-model';

/**
 * Both halves of a password reset: asking for the link, and using it.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormFeedback],
  providers: [ResetPasswordPageViewModel],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  /** State and behaviour of both forms. */
  protected readonly viewModel = inject(ResetPasswordPageViewModel);

  /** Where a finished reset points next. */
  protected readonly loginLink = APPLICATION_ROUTE_LINKS.login;
}
