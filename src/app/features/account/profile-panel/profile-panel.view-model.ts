import { Injectable, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../../core/api/models/registration.model';
import { UserAccountService } from '../../../core/user/user-account.service';
import { AbstractFormViewModel } from '../../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../../shared/forms/form-validation-messages.signal';

/**
 * State and behaviour behind the profile panel.
 *
 * <p>The display name is the only profile field the backend lets anyone change. The username is
 * fixed once chosen, and the email address deliberately cannot be moved: doing so would have to
 * prove the new address first, and that flow does not exist. Both are shown as facts elsewhere
 * on the page rather than as disabled inputs, which would only invite the attempt.</p>
 */
@Injectable()
export class ProfilePanelViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly userAccountService = inject(UserAccountService);

  /** The display-name form. */
  readonly profileForm = this.formBuilder.nonNullable.group({
    displayName: [
      '',
      [
        Validators.required,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.displayNameMaximumLength),
      ],
    ],
  });

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.profileForm,
    this.translationService,
  );

  /**
   * Fills the form with the name the account currently carries.
   *
   * @param currentDisplayName the account's display name as the backend reports it
   */
  seedWithCurrentDisplayName(currentDisplayName: string): void {
    this.profileForm.setValue({ displayName: currentDisplayName });
  }

  /**
   * Saves the new display name.
   */
  submitProfileChange(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.userAccountService.updateMyProfile(this.profileForm.getRawValue()).subscribe({
      next: () => this.completeSubmissionWith('account.saveProfileSuccess'),
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }
}
