import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { LoginPageViewModel } from './login-page.view-model';

/**
 * Signing in: with a password, or through Google.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormFeedback],
  providers: [LoginPageViewModel],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  /** State and behaviour of the sign-in form. */
  protected readonly viewModel = inject(LoginPageViewModel);

  /** The pages this one offers a way out to. */
  protected readonly routeLinks = APPLICATION_ROUTE_LINKS;
}
