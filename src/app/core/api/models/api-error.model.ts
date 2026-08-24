/**
 * The uniform error body every failing backend endpoint returns.
 *
 * <p>Mirrors {@code ApiErrorResponseDto} on the backend. Field names must not drift.</p>
 */
export interface ApiErrorResponse {
  /** Moment the failure was handled, ISO-8601. */
  readonly timestamp: string;
  /** HTTP status code. */
  readonly status: number;
  /** Short description of the failure category, for example {@code Not Found}. */
  readonly error: string;
  /** Human readable explanation. */
  readonly message: string;
  /** Per-field validation messages, empty when the failure was not a validation failure. */
  readonly validationErrors: readonly string[];
}
