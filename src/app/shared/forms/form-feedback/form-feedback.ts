import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Renders whatever a form has to say after a submission: what failed, what succeeded, and the
 * backend's per-field complaints.
 *
 * <p>Every form page shows the same three things in the same way, so the markup lives here once.
 * All three inputs arrive already worded — the component never translates and never decides.</p>
 */
@Component({
  selector: 'app-form-feedback',
  templateUrl: './form-feedback.html',
  styleUrl: './form-feedback.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormFeedback {
  /** What went wrong, empty when nothing did. */
  readonly failureMessage = input<string>('');

  /** What went right, empty until it does. */
  readonly successMessage = input<string>('');

  /** The backend's per-field complaints, empty when there are none. */
  readonly validationMessages = input<readonly string[]>([]);
}
