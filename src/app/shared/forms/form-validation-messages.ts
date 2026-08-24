import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * Finished, translated validation messages, keyed by field name.
 *
 * <p>An empty string means the field has nothing to complain about — which is what a template
 * renders as no message at all, without having to ask.</p>
 */
export type FieldValidationMessages = Readonly<Record<string, string>>;

/**
 * Turns a form's validation state into text a template can render directly.
 *
 * <p>Every form on this site validates the same handful of things — required, email shape,
 * minimum and maximum length, the username pattern — so wording them lives in one function
 * rather than in each view-model. View-models call this and expose the result; templates never
 * inspect a control.</p>
 *
 * <p>Only fields the user has actually touched produce a message. Shouting at somebody about a
 * field they have not reached yet is noise, not help.</p>
 *
 * @param form               the form to describe
 * @param translationService source of the wording
 * @returns one message per field, empty where the field is fine or untouched
 */
export function describeFormValidationErrors(
  form: FormGroup,
  translationService: TranslationService,
): FieldValidationMessages {
  const messagesByFieldName: Record<string, string> = {};

  for (const [fieldName, control] of Object.entries(form.controls)) {
    messagesByFieldName[fieldName] = describeControlErrors(control, translationService);
  }

  return messagesByFieldName;
}

/**
 * Words the first thing wrong with one control.
 *
 * <p>The first, not all of them: a field that is both too short and wrongly formatted is best
 * explained one problem at a time.</p>
 *
 * @param control            the control to describe
 * @param translationService source of the wording
 * @returns the message, or an empty string when there is nothing to say yet
 */
function describeControlErrors(
  control: AbstractControl,
  translationService: TranslationService,
): string {
  if (control.valid || !control.touched) {
    return '';
  }

  const validationErrors: ValidationErrors = control.errors ?? {};

  if (validationErrors['required']) {
    return translationService.translate('form.requiredField');
  }
  if (validationErrors['email']) {
    return translationService.translate('form.invalidEmail');
  }
  if (validationErrors['minlength']) {
    return translationService.translate('form.tooShort', {
      min: validationErrors['minlength'].requiredLength as number,
    });
  }
  if (validationErrors['maxlength']) {
    return translationService.translate('form.tooLong', {
      max: validationErrors['maxlength'].requiredLength as number,
    });
  }
  if (validationErrors['pattern']) {
    return translationService.translate('form.usernamePattern');
  }

  return translationService.translate('errors.validation');
}
