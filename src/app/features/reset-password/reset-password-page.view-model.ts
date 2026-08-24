import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { PasswordService } from '../../core/password/password.service';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/** Query parameter the backend puts the reset token in when it builds the link it mails. */
const RESET_TOKEN_PARAMETER = 'token';

/**
 * State and behaviour behind the password reset page.
 *
 * <p>One route serves both halves of the flow, because the visitor experiences them as one
 * thing. Without a token in the address it asks for the address to mail; with a token — which is
 * how the mailed link arrives — it asks for the new password. Which half is showing is decided
 * here, so the template only picks between two blocks of markup.</p>
 */
@Injectable()
export class ResetPasswordPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly passwordService = inject(PasswordService);
  private readonly activatedRoute = inject(ActivatedRoute);

  /** The token from the mailed link, absent when the visitor came here on their own. */
  private readonly resetToken =
    this.activatedRoute.snapshot.queryParamMap.get(RESET_TOKEN_PARAMETER);

  private readonly passwordWasSet = signal(false);

  /** Whether the visitor arrived holding a reset token, which is what decides the half shown. */
  readonly isSettingNewPassword = computed<boolean>(() => this.resetToken !== null);

  /** Whether the new password is in place, which is when the form gives way to a way out. */
  readonly isPasswordSet = this.passwordWasSet.asReadonly();

  /** The "mail me a link" form. */
  readonly requestForm = this.formBuilder.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.emailMaximumLength),
      ],
    ],
  });

  /** The "here is my new password" form. */
  readonly confirmationForm = this.formBuilder.nonNullable.group({
    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMinimumLength),
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMaximumLength),
      ],
    ],
  });

  /** Validation messages of the request form. */
  readonly requestValidationMessages = createFormValidationMessagesSignal(
    this.requestForm,
    this.translationService,
  );

  /** Validation messages of the confirmation form. */
  readonly confirmationValidationMessages = createFormValidationMessagesSignal(
    this.confirmationForm,
    this.translationService,
  );

  /**
   * Asks the backend to mail a reset link.
   *
   * <p>The backend always accepts, saying nothing about whether the address belongs to an
   * account, and its wording is shown as received for exactly that reason.</p>
   */
  submitResetRequest(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.passwordService.requestPasswordReset(this.requestForm.getRawValue()).subscribe({
      next: (acknowledgement) => this.completeSubmission(acknowledgement.message),
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /**
   * Sets the new password from the token in the address bar.
   *
   * <p>This signs every device out on the backend, which is the point of a reset: the old
   * password is usually untrusted precisely when it is being replaced.</p>
   */
  submitNewPassword(): void {
    if (this.confirmationForm.invalid || this.resetToken === null) {
      this.confirmationForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.passwordService
      .confirmPasswordReset({
        token: this.resetToken,
        newPassword: this.confirmationForm.getRawValue().newPassword,
      })
      .subscribe({
        next: () => {
          this.passwordWasSet.set(true);
          this.completeSubmissionWith('passwordReset.confirmSuccess');
        },
        error: (failure: unknown) => this.failSubmission(failure),
      });
  }
}
