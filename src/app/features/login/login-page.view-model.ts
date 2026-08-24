import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { AuthenticationService } from '../../core/auth/authentication.service';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/** Wording this page prefers: a refused sign-in is not an expired session. */
const LOGIN_FAILURE_WORDING = {
  401: 'errors.invalidCredentials',
} as const;

/** Query parameter naming the page the visitor was trying to reach when they were sent here. */
const RETURN_DESTINATION_PARAMETER = 'returnTo';

/**
 * State and behaviour behind the login form.
 *
 * <p>Two ways in are offered side by side. The password form is the ordinary one. The Google
 * button is the same button the registration page offers, because Google both creates and signs
 * in — the backend finds the account behind the Google identity or makes one. Putting the
 * provider button on the login page is what makes that honest: it is a way to <em>sign in</em>
 * that happens to create the account the first time.</p>
 *
 * <p>The extension connect code is deliberately <em>not</em> here. It is not a way in at all: it
 * is minted by an already signed-in user to bring a browser along, so it belongs on the devices
 * page, behind the session it requires.</p>
 */
@Injectable()
export class LoginPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The sign-in form. */
  readonly loginForm = this.formBuilder.nonNullable.group({
    usernameOrEmail: [
      '',
      [
        Validators.required,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.emailMaximumLength),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMaximumLength),
      ],
    ],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.loginForm,
    this.translationService,
  );

  /**
   * Signs in with the entered credentials and moves on.
   *
   * <p>On success the visitor lands where they were originally heading, if a guard sent them
   * here, and on their devices page otherwise.</p>
   */
  submitSignIn(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.authenticationService.signInWithPassword(this.loginForm.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl(this.resolveDestinationAfterSignIn()),
      error: (failure: unknown) => this.failSubmission(failure, LOGIN_FAILURE_WORDING),
    });
  }

  /**
   * Hands the visitor to Google.
   *
   * <p>A full page navigation: the flow is a redirect chain that ends on this site's OAuth
   * callback route, which is where the session is actually established.</p>
   */
  signInWithGoogle(): void {
    this.authenticationService.startGoogleSignIn();
  }

  /**
   * Works out where to go once signed in.
   *
   * @returns the page the visitor was originally after, or the devices page
   */
  private resolveDestinationAfterSignIn(): string {
    return (
      this.activatedRoute.snapshot.queryParamMap.get(RETURN_DESTINATION_PARAMETER) ??
      APPLICATION_ROUTE_LINKS.devices
    );
  }
}
