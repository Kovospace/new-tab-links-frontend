import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { UsageMetric, UsageMetricMonth } from '../api/models/usage-metric.model';
import { AdminSessionStore } from './admin-session.store';

/**
 * The usage counts, for the operator.
 *
 * <p>Carries the operator's token explicitly and keeps the interceptor out, exactly as
 * {@code AdminUserService} does and for the same reason: the two identities are never
 * interchangeable.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminUsageMetricsService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly adminSessionStore = inject(AdminSessionStore);

  /**
   * Loads one metric for one month, day by day.
   *
   * @param metric which count
   * @param month  the month, {@code YYYY-MM}
   * @returns every day of that month and the month's total
   */
  loadMonth(metric: UsageMetric, month: string): Observable<UsageMetricMonth> {
    return this.backendApiClient.get<UsageMetricMonth>(
      API_ENDPOINT_PATHS.admin.usageMetrics,
      { metric, month },
      {
        withoutAuthorization: true,
        bearerToken: this.adminSessionStore.getAccessToken() ?? undefined,
      },
    );
  }
}
