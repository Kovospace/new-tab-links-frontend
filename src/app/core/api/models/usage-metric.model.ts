/**
 * The usage counts the operator can chart, as the backend's {@code UsageMetric} names them.
 *
 * <p>Two different things, never added together: new tabs opened in the extension, and people
 * visiting this website.</p>
 */
export type UsageMetric = 'new_tabs' | 'website_visitors';

/** Every metric, in the order the statistics page shows them. */
export const USAGE_METRICS: readonly UsageMetric[] = ['new_tabs', 'website_visitors'];

/** One day's count, mirroring the backend's {@code UsageMetricDayDto}. */
export interface UsageMetricDay {
  /** The day, {@code YYYY-MM-DD}. Extension-local for new tabs, UTC for website visitors. */
  readonly day: string;
  /** What was counted that day; 0 when nothing was. */
  readonly value: number;
}

/** One metric over one month, mirroring the backend's {@code UsageMetricMonthDto}. */
export interface UsageMetricMonth {
  readonly metric: UsageMetric;
  /** The month, {@code YYYY-MM}. */
  readonly month: string;
  /** Every day of the month, in order — days with nothing counted are present with 0. */
  readonly days: readonly UsageMetricDay[];
  /** The month's sum. */
  readonly total: number;
}
