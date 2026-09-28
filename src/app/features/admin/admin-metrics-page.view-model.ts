import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminAuthenticationService } from '../../core/admin/admin-authentication.service';
import { AdminSessionStore } from '../../core/admin/admin-session.store';
import { AdminUsageMetricsService } from '../../core/admin/admin-usage-metrics.service';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import {
  USAGE_METRICS,
  UsageMetric,
  UsageMetricMonth,
} from '../../core/api/models/usage-metric.model';
import { TranslationService } from '../../core/i18n/translation.service';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import {
  FORMATTING_LOCALES,
  formatInstantForDisplay,
} from '../../shared/formatting/instant-formatter';

/** The chart's coordinate space; the SVG scales it to whatever width the page gives it. */
export const CHART_WIDTH = 720;
export const CHART_HEIGHT = 220;
/** Room left of the bars for the value labels, and below them for the day labels. */
const PLOT_LEFT = 44;
const PLOT_TOP = 8;
const PLOT_BOTTOM_MARGIN = 24;
/** Share of each day's slot the bar fills; the rest is the gap between bars. */
const BAR_FILL_RATIO = 0.7;
/** Days of the month that get a label under the axis. */
const LABELLED_DAYS = [1, 5, 10, 15, 20, 25];

/** A month to show, 1-based like {@code YYYY-MM}. */
interface CalendarMonth {
  readonly year: number;
  readonly month: number;
}

/** One day of a chart: its bar, and a full-height hover area so a zero day can be read too. */
export interface PresentedMetricBar {
  readonly slotX: number;
  readonly slotWidth: number;
  readonly barX: number;
  readonly barY: number;
  readonly barWidth: number;
  readonly barHeight: number;
  /** What hovering the day reads out: the date and its value. */
  readonly hoverText: string;
}

/** A label placed along one of the chart's axes. */
export interface PresentedAxisLabel {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

/** One metric's chart for the displayed month, ready to render. */
export interface PresentedMetricChart {
  readonly metric: UsageMetric;
  readonly title: string;
  readonly explanation: string;
  readonly totalLabel: string;
  readonly bars: readonly PresentedMetricBar[];
  readonly dayLabels: readonly PresentedAxisLabel[];
  readonly valueLabels: readonly PresentedAxisLabel[];
  /** Where the horizontal axis line runs. */
  readonly baselineY: number;
  readonly baselineStartX: number;
  readonly baselineEndX: number;
}

/**
 * State behind the operator's statistics page.
 *
 * <p>Two charts, deliberately never combined: new tabs opened in the extension, and people
 * visiting this website. They count different things on different clocks (the extension's local
 * dates, the backend's UTC days), so a sum would mean nothing. One month at a time, shared by
 * both, starting at the current one.</p>
 *
 * <p>Every bar is computed here, down to its coordinates, so the template draws finished shapes.
 * Hovering a day reads out its date and value through the SVG's own {@code <title>}, which every
 * browser shows as a tooltip and screen readers announce, with no script.</p>
 */
@Injectable()
export class AdminMetricsPageViewModel {
  private readonly adminUsageMetricsService = inject(AdminUsageMetricsService);
  private readonly adminAuthenticationService = inject(AdminAuthenticationService);
  private readonly adminSessionStore = inject(AdminSessionStore);
  private readonly backendFailureTranslator = inject(BackendFailureTranslator);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  private readonly currentMonth = calendarMonthOf(new Date());
  private readonly displayedMonth = signal<CalendarMonth>(this.currentMonth);
  private readonly loadedMonths = signal<readonly UsageMetricMonth[]>([]);
  private readonly loadingInProgress = signal(false);
  private readonly loadFailureMessage = signal('');

  /** Whether the displayed month is still being fetched. */
  readonly isLoading = this.loadingInProgress.asReadonly();
  /** Why the month could not be shown, or empty. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /** Width and height of the charts' coordinate space. */
  readonly chartViewBox = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`;

  /** The displayed month, as the reader's language names it. */
  readonly displayedMonthLabel = computed(() => {
    const { year, month } = this.displayedMonth();
    return new Intl.DateTimeFormat(this.formattingLocale(), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  });

  /** Whether there is a later month to go to; the future has nothing counted yet. */
  readonly canShowNextMonth = computed(
    () => monthKey(this.displayedMonth()) < monthKey(this.currentMonth),
  );

  /** Both charts for the displayed month, in the order they are shown. */
  readonly presentedCharts = computed<readonly PresentedMetricChart[]>(() =>
    this.loadedMonths().map((loadedMonth) => this.presentChart(loadedMonth)),
  );

  /** When the operator's own session expires, as finished text. */
  readonly sessionExpiryLabel = computed(() => {
    const expiry = this.adminSessionStore.expiresAt();
    return expiry === null
      ? ''
      : formatInstantForDisplay(
          expiry.toISOString(),
          this.translationService.currentLanguageCode(),
        );
  });

  /** Where the operator's other page is. */
  readonly accountsLink = APPLICATION_ROUTE_LINKS.adminUsers;

  /** Loads the displayed month of both metrics. */
  loadDisplayedMonth(): void {
    const month = monthKey(this.displayedMonth());
    this.loadingInProgress.set(true);
    this.loadFailureMessage.set('');
    forkJoin(
      USAGE_METRICS.map((metric) => this.adminUsageMetricsService.loadMonth(metric, month)),
    ).subscribe({
      next: (loadedMonths) => {
        this.loadedMonths.set(loadedMonths);
        this.loadingInProgress.set(false);
      },
      error: (failure: unknown) => {
        this.loadedMonths.set([]);
        this.loadFailureMessage.set(this.backendFailureTranslator.describeFailure(failure));
        this.loadingInProgress.set(false);
      },
    });
  }

  /** Goes one month back. */
  showPreviousMonth(): void {
    this.displayedMonth.update((month) => shiftMonth(month, -1));
    this.loadDisplayedMonth();
  }

  /** Goes one month forward, never past the current one. */
  showNextMonth(): void {
    if (!this.canShowNextMonth()) {
      return;
    }
    this.displayedMonth.update((month) => shiftMonth(month, 1));
    this.loadDisplayedMonth();
  }

  /** Ends the operator's session and returns to the sign-in. */
  signOut(): void {
    this.adminAuthenticationService.signOut();
    void this.router.navigateByUrl(APPLICATION_ROUTE_LINKS.admin);
  }

  /**
   * Lays one metric's month out as bars and axis labels.
   *
   * @param loadedMonth the month as the backend reported it
   * @returns the chart, ready to render
   */
  private presentChart(loadedMonth: UsageMetricMonth): PresentedMetricChart {
    const plotWidth = CHART_WIDTH - PLOT_LEFT;
    const baselineY = CHART_HEIGHT - PLOT_BOTTOM_MARGIN;
    const plotHeight = baselineY - PLOT_TOP;
    const slotWidth = plotWidth / Math.max(loadedMonth.days.length, 1);
    const highestValue = Math.max(1, ...loadedMonth.days.map((day) => day.value));
    const barWidth = slotWidth * BAR_FILL_RATIO;

    const bars = loadedMonth.days.map((day, dayPosition) => {
      const slotX = PLOT_LEFT + dayPosition * slotWidth;
      const barHeight = (day.value / highestValue) * plotHeight;
      return {
        slotX,
        slotWidth,
        barX: slotX + (slotWidth - barWidth) / 2,
        barY: baselineY - barHeight,
        barWidth,
        barHeight,
        hoverText: this.translationService.translate('admin.metrics.dayValue', {
          day: this.formatDay(day.day),
          value: this.formatNumber(day.value),
        }),
      };
    });

    const lastDay = loadedMonth.days.length;
    const dayLabels = [...LABELLED_DAYS.filter((day) => day < lastDay - 2), lastDay]
      .filter((day) => day >= 1)
      .map((day) => ({
        x: PLOT_LEFT + (day - 0.5) * slotWidth,
        y: CHART_HEIGHT - 6,
        text: String(day),
      }));

    return {
      metric: loadedMonth.metric,
      title: this.translationService.translate(`admin.metrics.${loadedMonth.metric}.title`),
      explanation: this.translationService.translate(
        `admin.metrics.${loadedMonth.metric}.explanation`,
      ),
      totalLabel: this.translationService.translate('admin.metrics.total', {
        total: this.formatNumber(loadedMonth.total),
      }),
      bars,
      dayLabels,
      valueLabels: [
        { x: PLOT_LEFT - 8, y: PLOT_TOP + 10, text: this.formatNumber(highestValue) },
        { x: PLOT_LEFT - 8, y: baselineY, text: '0' },
      ],
      baselineY,
      baselineStartX: PLOT_LEFT,
      baselineEndX: CHART_WIDTH,
    };
  }

  /**
   * Formats a {@code YYYY-MM-DD} day without letting the time zone move it to a neighbour.
   *
   * @param isoDay the day as the backend sends it
   * @returns the day in the reader's language
   */
  private formatDay(isoDay: string): string {
    const [year, month, day] = isoDay.split('-').map(Number);
    return new Intl.DateTimeFormat(this.formattingLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat(this.formattingLocale()).format(value);
  }

  private formattingLocale(): string {
    return FORMATTING_LOCALES[this.translationService.currentLanguageCode()];
  }
}

/**
 * The calendar month a moment falls in, in the operator's own time zone.
 *
 * @param moment any moment
 * @returns its month
 */
function calendarMonthOf(moment: Date): CalendarMonth {
  return { year: moment.getFullYear(), month: moment.getMonth() + 1 };
}

/**
 * Moves a month forwards or backwards, across year boundaries.
 *
 * @param calendarMonth the month to move from
 * @param monthCount    how many months, negative for earlier
 * @returns the resulting month
 */
function shiftMonth(calendarMonth: CalendarMonth, monthCount: number): CalendarMonth {
  const zeroBasedMonths = calendarMonth.year * 12 + (calendarMonth.month - 1) + monthCount;
  return { year: Math.floor(zeroBasedMonths / 12), month: (zeroBasedMonths % 12) + 1 };
}

/**
 * Writes a month the way the backend expects it, which also sorts correctly as text.
 *
 * @param calendarMonth the month
 * @returns {@code YYYY-MM}
 */
function monthKey(calendarMonth: CalendarMonth): string {
  return `${calendarMonth.year}-${String(calendarMonth.month).padStart(2, '0')}`;
}
