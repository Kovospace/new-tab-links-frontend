import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient, BackendRequestOptions } from '../api/backend-api.client';
import {
  PlanLimits,
  UserFairUseLimits,
  UserFairUseLimitsUpdate,
} from '../api/models/plan-limits.model';
import { AdminSessionStore } from './admin-session.store';

/**
 * The Fair Use limits, for the operator: the global values every account is held to, and the
 * raised values a single account may be given on top of them.
 *
 * <p>Carries the operator's token explicitly and keeps the interceptor out, exactly as
 * {@code AdminUserService} does and for the same reason: the two identities are never
 * interchangeable.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminFairUseLimitsService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly adminSessionStore = inject(AdminSessionStore);

  /**
   * Reads the global Fair Use limits.
   *
   * @returns all eight values
   */
  loadGlobalLimits(): Observable<PlanLimits> {
    return this.backendApiClient.get<PlanLimits>(
      API_ENDPOINT_PATHS.admin.fairUseLimits,
      undefined,
      this.asTheOperator(),
    );
  }

  /**
   * Replaces the global Fair Use limits.
   *
   * <p>Whatever calls this must have warned about a decrease first: a lower closed tabs or
   * browsing history cap deletes users' entries above it on their next synchronisation.</p>
   *
   * @param limits all eight values, each a whole number of at least one
   * @returns the values as saved
   */
  saveGlobalLimits(limits: PlanLimits): Observable<PlanLimits> {
    return this.backendApiClient.put<PlanLimits>(
      API_ENDPOINT_PATHS.admin.fairUseLimits,
      limits,
      this.asTheOperator(),
    );
  }

  /**
   * Reads one account's raised limits, beside the global ones and the result.
   *
   * @param userId identifier of the account
   * @returns the overrides, the note, the global and the effective limits
   */
  loadUserLimits(userId: string): Observable<UserFairUseLimits> {
    return this.backendApiClient.get<UserFairUseLimits>(
      API_ENDPOINT_PATHS.admin.userFairUseLimits(userId),
      undefined,
      this.asTheOperator(),
    );
  }

  /**
   * Replaces one account's raised limits.
   *
   * @param userId identifier of the account
   * @param update every override, {@code null} where the account inherits, and the note
   * @returns the account's limits as saved
   */
  saveUserLimits(userId: string, update: UserFairUseLimitsUpdate): Observable<UserFairUseLimits> {
    return this.backendApiClient.put<UserFairUseLimits>(
      API_ENDPOINT_PATHS.admin.userFairUseLimits(userId),
      update,
      this.asTheOperator(),
    );
  }

  /**
   * Removes every override from one account, which puts it back on the global limits.
   *
   * @param userId identifier of the account
   * @returns an observable that completes once the overrides are gone
   */
  removeUserLimits(userId: string): Observable<void> {
    return this.backendApiClient.delete<void>(
      API_ENDPOINT_PATHS.admin.userFairUseLimits(userId),
      undefined,
      this.asTheOperator(),
    );
  }

  /**
   * Builds the options that make a request speak as the operator.
   *
   * @returns options carrying the admin token and keeping the interceptor out of the way
   */
  private asTheOperator(): BackendRequestOptions {
    return {
      withoutAuthorization: true,
      bearerToken: this.adminSessionStore.getAccessToken() ?? undefined,
    };
  }
}
