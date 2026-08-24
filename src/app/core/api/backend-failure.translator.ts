import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslationService } from '../i18n/translation.service';
import { ApiErrorResponse } from './models/api-error.model';

/** Status the browser reports when the request never reached the backend at all. */
const NETWORK_FAILURE_STATUS = 0;

/** Statuses that get wording of their own rather than the generic message. */
const BAD_REQUEST_STATUS = 400;
const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

/**
 * Turns a failed backend call into a sentence the user can read.
 *
 * <p>Lives here rather than in each view-model because every page needs the same answer to the
 * same failures, and because it keeps the translation of an error next to the knowledge of what
 * the backend's statuses mean.</p>
 *
 * <p>Validation failures are the one case where the backend's own text is preferred: it names
 * the offending field, which no generic wording can.</p>
 */
@Injectable({ providedIn: 'root' })
export class BackendFailureTranslator {
  private readonly translationService = inject(TranslationService);

  /**
   * Words a failure for display.
   *
   * @param failure  whatever the failing call threw
   * @param context  optional per-page overrides, keyed by status code, naming a translation key
   *                 to use instead of the default wording for that status
   * @returns a translated sentence, never empty
   */
  describeFailure(failure: unknown, context?: FailureWordingOverrides): string {
    if (!(failure instanceof HttpErrorResponse)) {
      return this.translationService.translate('errors.generic');
    }

    const overriddenTranslationKey = context?.[failure.status];
    if (overriddenTranslationKey) {
      return this.translationService.translate(overriddenTranslationKey);
    }

    return this.translationService.translate(this.resolveTranslationKeyFor(failure));
  }

  /**
   * Extracts the backend's per-field validation messages.
   *
   * <p>Shown as-is: the backend names the field and the constraint, and translating that
   * faithfully would mean mirroring every constraint message here.</p>
   *
   * @param failure whatever the failing call threw
   * @returns the messages, empty when the failure was not a validation failure
   */
  extractValidationMessages(failure: unknown): readonly string[] {
    if (!(failure instanceof HttpErrorResponse) || failure.status !== BAD_REQUEST_STATUS) {
      return [];
    }

    const errorBody = failure.error as ApiErrorResponse | null;
    return errorBody?.validationErrors ?? [];
  }

  /**
   * Picks the default wording for a status.
   *
   * @param failure the failed response
   * @returns the translation key describing it
   */
  private resolveTranslationKeyFor(failure: HttpErrorResponse): string {
    switch (failure.status) {
      case NETWORK_FAILURE_STATUS:
        return 'errors.network';
      case BAD_REQUEST_STATUS:
        return 'errors.validation';
      case UNAUTHORIZED_STATUS:
        return 'errors.unauthorized';
      case NOT_FOUND_STATUS:
        return 'errors.notFound';
      case CONFLICT_STATUS:
        return 'errors.generic';
      default:
        return 'errors.generic';
    }
  }
}

/**
 * Per-page wording for particular statuses, keyed by status code.
 *
 * <p>Lets the login page say "those credentials were refused" for a 401 where the account page
 * would say "your session has ended", without either page reimplementing the rest.</p>
 */
export type FailureWordingOverrides = Readonly<Record<number, string>>;
