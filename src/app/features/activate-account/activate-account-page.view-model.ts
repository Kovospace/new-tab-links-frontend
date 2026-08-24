import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { AuthenticationService } from '../../core/auth/authentication.service';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/** Query parameter the backend puts the activation token in when it builds the link it mails. */
const ACTIVATION_TOKEN_PARAMETER = 'token';

/** How far the activation attempt has got. */
export type ActivationOutcome = 'pending' | 'succeeded' | 'failed' | 'missing-token';

/**
 * State and behaviour behind the activation landing page.
 *
 * <p>This page is the far end of the link the backend mails after registration. It runs the
 * activation the moment it opens — there is nothing for the user to confirm, and asking them to
 * press a button after they have already pressed a link is ceremony.</p>
 *
 * <p>Activation tokens work once and expire after a day, so a failure is common enough to
 * deserve a way out: the resend form below asks for a fresh link.</p>
 */
@Injectable()
export class ActivateAccountPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly activationOutcome = signal<ActivationOutcome>('pending');
  private readonly activationFailureMessage = signal('');

  /** How far the activation attempt has got. */
  readonly outcome = this.activationOutcome.asReadonly();

  /** Why activation failed, empty while it has not. */
  readonly activationFailure = this.activationFailureMessage.asReadonly();

  /** Whether the resend form is worth showing at all. */
  readonly isResendOffered = computed<boolean>(() => this.activationOutcome() !== 'succeeded');

  /** The "send me a new link" form. */
  readonly resendForm = this.formBuilder.nonNullable.group({
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.emailMaximumLength),
      ],
    ],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.resendForm,
    this.translationService,
  );

  /**
   * Runs the activation for the token in the address bar.
   *
   * <p>Called once when the page opens. A link with no token at all is its own outcome, because
   * the advice differs: there is nothing to retry, the link was mangled on its way here.</p>
   */
  activateFromLink(): void {
    const activationToken = this.activatedRoute.snapshot.queryParamMap.get(
      ACTIVATION_TOKEN_PARAMETER,
    );

    if (!activationToken) {
      this.activationOutcome.set('missing-token');
      return;
    }

    this.authenticationService.activateAccount(activationToken).subscribe({
      next: () => this.activationOutcome.set('succeeded'),
      error: () => {
        this.activationOutcome.set('failed');
        this.activationFailureMessage.set(this.translationService.translate('errors.generic'));
      },
    });
  }

  /**
   * Asks for a fresh activation link.
   *
   * <p>The backend answers the same way whether or not anything was sent, and its wording is
   * shown as received for the same reason it is on the registration form.</p>
   */
  submitResendRequest(): void {
    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.authenticationService.resendActivationLink(this.resendForm.getRawValue().email).subscribe({
      next: (acknowledgement) => this.completeSubmission(acknowledgement.message),
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }
}
