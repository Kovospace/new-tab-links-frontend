import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthenticationService } from '../../core/admin/admin-authentication.service';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/**
 * Wording this page prefers.
 *
 * <p>401 is a refused credential rather than an expired session, and 429 is the lockout — the one
 * message here that is worth saying plainly, because an operator who has mistyped their password
 * five times needs to be told to wait rather than to keep trying.</p>
 */
const ADMIN_SIGN_IN_FAILURE_WORDING = {
  401: 'errors.invalidCredentials',
  429: 'admin.signIn.lockedOut',
} as const;

/**
 * State and behaviour behind the operator sign-in.
 *
 * <p>Nothing here is shared with the ordinary login page, and that is deliberate: the operator is
 * not a user, holds a different kind of token, and signing in as one has no bearing on the
 * other.</p>
 */
@Injectable()
export class AdminLoginPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminAuthenticationService = inject(AdminAuthenticationService);
  private readonly router = inject(Router);

  /** The operator sign-in form. */
  readonly signInForm = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.signInForm,
    this.translationService,
  );

  /** Signs the operator in and opens the account list. */
  submitSignIn(): void {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    const { username, password } = this.signInForm.getRawValue();
    this.adminAuthenticationService.signIn(username, password).subscribe({
      next: () => void this.router.navigateByUrl(APPLICATION_ROUTE_LINKS.adminUsers),
      error: (failure: unknown) => this.failSubmission(failure, ADMIN_SIGN_IN_FAILURE_WORDING),
    });
  }
}
