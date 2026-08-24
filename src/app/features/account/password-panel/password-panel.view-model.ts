import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PasswordChangeRequest } from '../../../core/api/models/password.model';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../../core/api/models/registration.model';
import { PasswordService } from '../../../core/password/password.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../../shared/forms/form-validation-messages.signal';

/** Wording this panel prefers: a 401 here means the current password was wrong. */
const PASSWORD_FAILURE_WORDING = {
  401: 'errors.invalidCredentials',
} as const;

/**
 * State and behaviour behind the password panel.
 *
 * <p>Setting a password and changing one are the same backend endpoint, and the difference is
 * one field: the current password is required only when the account already has one. An account
 * created through Google has none, and its owner supplies just the new password — there is
 * nothing to prove, because they are already authenticated.</p>
 *
 * <p>Either way the backend signs every device out, this browser included. The wording says so
 * before the user presses the button.</p>
 */
@Injectable()
export class PasswordPanelViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly passwordService = inject(PasswordService);

  /** Whether the account already has a password, which decides what has to be filled in. */
  private accountHasPassword = false;

  /** The password form; the current-password field is only used when there is one to prove. */
  readonly passwordForm = this.formBuilder.nonNullable.group({
    currentPassword: [
      '',
      [Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMaximumLength)],
    ],
    newPassword: [
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
    this.passwordForm,
    this.translationService,
  );

  /**
   * Tells the panel whether it is setting a first password or changing an existing one.
   *
   * <p>Adds the required-validator to the current-password field only in the second case, so
   * that a Google account is never asked for a password it does not have.</p>
   *
   * @param hasPassword whether the account already carries a password
   */
  configureForAccount(hasPassword: boolean): void {
    this.accountHasPassword = hasPassword;

    const currentPasswordControl = this.passwordForm.controls.currentPassword;
    if (hasPassword) {
      currentPasswordControl.addValidators(Validators.required);
    } else {
      currentPasswordControl.removeValidators(Validators.required);
    }
    currentPasswordControl.updateValueAndValidity();
  }

  /**
   * Sets or changes the password.
   */
  submitPasswordChange(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.passwordService.setOrChangeMyPassword(this.buildChangeRequest()).subscribe({
      next: () => {
        this.completeSubmissionWith('account.passwordSuccess');
        this.passwordForm.reset();
      },
      error: (failure: unknown) => this.failSubmission(failure, PASSWORD_FAILURE_WORDING),
    });
  }

  /**
   * Builds the request body, omitting the current password when there is none.
   *
   * <p>Omitting rather than sending an empty string: the backend treats the field as absent, and
   * an empty string would read as a wrong password.</p>
   *
   * @returns the body to send
   */
  private buildChangeRequest(): PasswordChangeRequest {
    const enteredValues = this.passwordForm.getRawValue();

    return this.accountHasPassword
      ? { currentPassword: enteredValues.currentPassword, newPassword: enteredValues.newPassword }
      : { newPassword: enteredValues.newPassword };
  }
}
