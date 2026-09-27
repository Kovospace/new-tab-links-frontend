import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { SubscriptionStatus } from '../api/models/subscription.model';

/**
 * The signed-in account's premium standing.
 *
 * <p>Its own service rather than another method on {@code UserAccountService}, and that is the
 * load-bearing decision here. The backend serves this from its payment module at
 * {@code GET /api/v1/payments/subscription} rather than widening the account's DTO, because that
 * DTO is embedded in the sync snapshot the Chrome extension pulls — billing detail would otherwise
 * be shipped to the extension on every sync, in a payload that has nothing to do with it. Only the
 * {@code premium} flag rides on the account; which plan, until when, and whether it renews are
 * here.</p>
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly backendApiClient = inject(BackendApiClient);

  /**
   * Fetches the account's premium standing.
   *
   * <p>The backend answers 200 for every signed-in account, including one that has bought
   * nothing — that case is {@code state: 'NONE'}, not a 404. So a failure here really does mean
   * something went wrong, and callers may treat it that way.</p>
   *
   * @returns the subscription status
   */
  loadMySubscription(): Observable<SubscriptionStatus> {
    return this.backendApiClient.get<SubscriptionStatus>(
      API_ENDPOINT_PATHS.payments.mySubscription,
    );
  }
}
