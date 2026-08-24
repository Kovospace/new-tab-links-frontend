import { Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { TranslationService } from '../../core/i18n/translation.service';
import { FieldValidationMessages, describeFormValidationErrors } from './form-validation-messages';

/**
 * Exposes a reactive form's validation messages as a signal.
 *
 * <p>Reactive forms report their state through observables, and the rest of this project is
 * built on signals. This bridges the two once, so that no view-model repeats the wiring and no
 * template has to reach into a control to find out what is wrong with it.</p>
 *
 * <p>It listens to the form's whole event stream rather than only to {@code statusChanges},
 * because a field becoming touched changes what should be shown without changing validity.</p>
 *
 * <p>Must be called from an injection context — a view-model's field initialiser is one.</p>
 *
 * @param form               the form to watch
 * @param translationService source of the wording
 * @returns a signal carrying one finished message per field
 */
export function createFormValidationMessagesSignal(
  form: FormGroup,
  translationService: TranslationService,
): Signal<FieldValidationMessages> {
  const latestFormEvent = toSignal(form.events, { initialValue: null });

  return computed(() => {
    // Read purely to re-evaluate whenever the form reports anything at all.
    latestFormEvent();
    return describeFormValidationErrors(form, translationService);
  });
}
