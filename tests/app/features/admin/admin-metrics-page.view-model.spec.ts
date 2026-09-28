import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsageMetricsService } from '@app/core/admin/admin-usage-metrics.service';
import { BackendFailureTranslator } from '@app/core/api/backend-failure.translator';
import { UsageMetric, UsageMetricMonth } from '@app/core/api/models/usage-metric.model';
import { TranslationService } from '@app/core/i18n/translation.service';
import {
  AdminMetricsPageViewModel,
  CHART_HEIGHT,
} from '@app/features/admin/admin-metrics-page.view-model';

/** A month where day N was counted N times, so the highest day is the last one. */
function monthOf(metric: UsageMetric, month: string, dayCount: number): UsageMetricMonth {
  const days = Array.from({ length: dayCount }, (_, index) => ({
    day: `${month}-${String(index + 1).padStart(2, '0')}`,
    value: index + 1,
  }));
  return { metric, month, days, total: days.reduce((sum, day) => sum + day.value, 0) };
}

/**
 * Both metrics are loaded for one shared month, never summed, and laid out as finished bars.
 */
describe('AdminMetricsPageViewModel', () => {
  let requestedMonths: string[];
  let loadMonth: (metric: UsageMetric, month: string) => Observable<UsageMetricMonth>;
  let viewModel: AdminMetricsPageViewModel;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    requestedMonths = [];
    loadMonth = (metric, month) => {
      requestedMonths.push(`${metric} ${month}`);
      return of(monthOf(metric, month, 30));
    };
    TestBed.configureTestingModule({
      providers: [
        AdminMetricsPageViewModel,
        {
          provide: AdminUsageMetricsService,
          useValue: { loadMonth: (metric: UsageMetric, month: string) => loadMonth(metric, month) },
        },
        { provide: BackendFailureTranslator, useValue: { describeFailure: () => 'It failed.' } },
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode: signal('en'),
            translate: (key: string, values?: Record<string, string>) =>
              values ? `${key} ${JSON.stringify(values)}` : key,
          },
        },
      ],
    });
    viewModel = TestBed.inject(AdminMetricsPageViewModel);
  });

  afterEach(() => vi.useRealTimers());

  it('loads both metrics for the current month, as two separate charts', () => {
    viewModel.loadDisplayedMonth();

    expect(requestedMonths).toEqual(['new_tabs 2026-09', 'website_visitors 2026-09']);
    expect(viewModel.displayedMonthLabel()).toBe('September 2026');
    const charts = viewModel.presentedCharts();
    expect(charts.map((chart) => chart.metric)).toEqual(['new_tabs', 'website_visitors']);
    expect(charts[0].title).toBe('admin.metrics.new_tabs.title');
    expect(charts[0].totalLabel).toBe('admin.metrics.total {"total":"465"}');
    expect(charts[0].bars).toHaveLength(30);
  });

  it('draws the highest day full height and reads each day out on hover', () => {
    viewModel.loadDisplayedMonth();
    const chart = viewModel.presentedCharts()[0];
    const highestBar = chart.bars[29];
    const lowestBar = chart.bars[0];

    expect(highestBar.barY + highestBar.barHeight).toBeCloseTo(chart.baselineY);
    expect(highestBar.barHeight).toBeCloseTo(lowestBar.barHeight * 30);
    expect(chart.baselineY).toBeLessThan(CHART_HEIGHT);
    expect(highestBar.hoverText).toBe(
      'admin.metrics.dayValue {"day":"30 September 2026","value":"30"}',
    );
    expect(chart.dayLabels.map((label) => label.text)).toEqual([
      '1',
      '5',
      '10',
      '15',
      '20',
      '25',
      '30',
    ]);
    expect(chart.valueLabels.map((label) => label.text)).toEqual(['30', '0']);
  });

  it('moves back a month and across the year, but never past the current month', () => {
    expect(viewModel.canShowNextMonth()).toBe(false);
    viewModel.showNextMonth();
    expect(requestedMonths).toEqual([]);

    for (let step = 0; step < 9; step += 1) {
      viewModel.showPreviousMonth();
    }
    expect(viewModel.displayedMonthLabel()).toBe('December 2025');
    expect(requestedMonths.at(-1)).toBe('website_visitors 2025-12');
    expect(viewModel.canShowNextMonth()).toBe(true);

    viewModel.showNextMonth();
    expect(requestedMonths.at(-1)).toBe('website_visitors 2026-01');
  });

  it('shows why a month could not be loaded, and no stale charts', () => {
    viewModel.loadDisplayedMonth();
    loadMonth = () => throwError(() => new Error('down'));
    viewModel.showPreviousMonth();

    expect(viewModel.loadFailure()).toBe('It failed.');
    expect(viewModel.presentedCharts()).toEqual([]);
    expect(viewModel.isLoading()).toBe(false);
  });
});
