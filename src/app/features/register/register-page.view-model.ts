import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { AuthenticationService } from '../../core/auth/authentication.service';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/** Wording this page prefers over the default for a status the backend uses meaningfully here. */
const REGISTRATION_FAILURE_WORDING = {
  409: 'errors.usernameTaken',
} as const;

/**
 * State and behaviour behind the registration form.
 *
 * <p>The form mirrors the backend's own constraints so that an obvious mistake is caught before
 * a round trip; the backend stays the authority and its complaints are shown when it disagrees.</p>
 *
 * <p>A successful registration does not sign anyone in. The account is created in
 * {@code PENDING_ACTIVATION} and an activation link is mailed; only after that link is followed
 * can the account authenticate. The backend's own wording is shown as received, because it is
 * deliberately identical whether the account was created or the address was already taken —
 * replacing it would turn this form into a way of discovering who is registered.</p>
 */
@Injectable()
export class RegisterPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);

  /** The registration form, with the backend's constraints restated as validators. */
  readonly registrationForm = this.formBuilder.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.usernameMinimumLength),
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.usernameMaximumLength),
        Validators.pattern(REGISTRATION_FIELD_CONSTRAINTS.usernamePattern),
      ],
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.emailMaximumLength),
      ],
    ],
    displayName: [
      '',
      [
        Validators.required,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.displayNameMaximumLength),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMinimumLength),
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMaximumLength),
      ],
    ],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.registrationForm,
    this.translationService,
  );

  /**
   * Submits the form.
   *
   * <p>An invalid form is marked touched instead of sent, which is what makes the per-field
   * messages appear for someone who pressed the button without filling anything in.</p>
   */
  submitRegistration(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.authenticationService.register(this.registrationForm.getRawValue()).subscribe({
      next: (acknowledgement) => {
        this.completeSubmission(acknowledgement.message);
        this.registrationForm.reset();
      },
      error: (failure: unknown) => this.failSubmission(failure, REGISTRATION_FAILURE_WORDING),
    });
  }

  /**
   * Hands the visitor to Google instead.
   *
   * <p>Google both creates and signs in — the backend finds the account or makes one — so the
   * same button serves registration and login, and there is nothing to fill in here first.</p>
   */
  registerWithGoogle(): void {
    this.authenticationService.startGoogleSignIn();
  }
}
