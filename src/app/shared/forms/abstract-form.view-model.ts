import { Signal, computed, inject, signal } from '@angular/core';
import {
  BackendFailureTranslator,
  FailureWordingOverrides,
} from '../../core/api/backend-failure.translator';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * What every form on this site has in common: whether it is in flight, and what to tell the user
 * when it comes back.
 *
 * <p>Extracted so that six view-models do not each carry the same three signals and the same
 * error-wording call. Subclasses build their own form and decide what submitting means; this
 * class only owns the outcome.</p>
 */
export abstract class AbstractFormViewModel {
  /** Source of wording for the subclass's own messages. */
  protected readonly translationService = inject(TranslationService);

  /** Turns a failed backend call into a sentence. */
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly submissionInFlight = signal(false);
  private readonly submissionFailureMessage = signal('');
  private readonly submissionSuccessMessage = signal('');
  private readonly submissionValidationMessages = signal<readonly string[]>([]);

  /** Whether a submission is in flight, which is what disables the submit button. */
  readonly isSubmitting = this.submissionInFlight.asReadonly();

  /** What went wrong, empty when nothing did. */
  readonly submissionFailure = this.submissionFailureMessage.asReadonly();

  /** What went right, empty until it does. */
  readonly submissionSuccess = this.submissionSuccessMessage.asReadonly();

  /** The backend's own per-field complaints, empty when there are none. */
  readonly backendValidationMessages = this.submissionValidationMessages.asReadonly();

  /** Whether the form has anything at all to report. */
  readonly hasFeedback: Signal<boolean> = computed(
    () =>
      this.submissionFailureMessage().length > 0 ||
      this.submissionSuccessMessage().length > 0 ||
      this.submissionValidationMessages().length > 0,
  );

  /**
   * Marks a submission as started, clearing whatever the previous one said.
   *
   * <p>Clearing matters: a success banner still standing while the next attempt runs reads as if
   * the new attempt had already succeeded.</p>
   */
  protected beginSubmission(): void {
    this.submissionInFlight.set(true);
    this.submissionFailureMessage.set('');
    this.submissionSuccessMessage.set('');
    this.submissionValidationMessages.set([]);
  }

  /**
   * Records a failed submission.
   *
   * @param failure          whatever the call threw
   * @param wordingOverrides per-status wording this particular form prefers
   */
  protected failSubmission(failure: unknown, wordingOverrides?: FailureWordingOverrides): void {
    this.submissionInFlight.set(false);
    this.submissionFailureMessage.set(
      this.failureTranslator.describeFailure(failure, wordingOverrides),
    );
    this.submissionValidationMessages.set(
      this.failureTranslator.extractValidationMessages(failure),
    );
  }

  /**
   * Records a successful submission.
   *
   * @param successMessage finished text to show, already translated
   */
  protected completeSubmission(successMessage: string): void {
    this.submissionInFlight.set(false);
    this.submissionSuccessMessage.set(successMessage);
  }

  /**
   * Records a successful submission whose wording lives in the translation files.
   *
   * @param successTranslationKey key of the text to show
   */
  protected completeSubmissionWith(successTranslationKey: string): void {
    this.completeSubmission(this.translationService.translate(successTranslationKey));
  }
}
