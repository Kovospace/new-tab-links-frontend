import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Refuses a value that is not a whole number; an empty field passes, so that "required" stays a
 * separate decision.
 *
 * <p>An {@code <input type="number">} accepts {@code 2.5} and {@code 1e3}, and the backend's
 * limits are integers, so the form says so before the backend has to.</p>
 *
 * @param control the control to check
 * @returns {@code { wholeNumber: true }} for a fraction or anything not a number, else null
 */
export function wholeNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' && Number.isInteger(value) ? null : { wholeNumber: true };
}
