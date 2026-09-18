import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NO_SUBSCRIPTION, SubscriptionStatus } from '../api/models/subscription.model';

/**
 * The signed-in account's premium standing.
 *
 * <p>Its own service rather than another method on {@code UserAccountService}, and that is the
 * load-bearing decision here. The backend will serve this from a separate billing module at
 * {@code GET /api/v1/billing/subscription} rather than widening {@code UserDto}, because
 * {@code UserDto} is embedded in the sync snapshot the Chrome extension pulls — billing state
 * would otherwise be shipped to the extension on every sync, in a payload that has nothing to do
 * with it. Keeping the two apart here means that if premium ever *does* appear on the account as
 * well, it can be folded in without the account page or any panel noticing.</p>
 *
 * <p><strong>The endpoint does not exist yet.</strong> Until it does, this answers the shape the
 * backend has promised for an account that never bought anything, so the account page renders its
 * real "not premium" branch rather than an error state nobody will ever see again. When the
 * endpoint ships, the body of {@link loadMySubscription} becomes a {@code BackendApiClient} call
 * and nothing above it changes.</p>
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
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
    return of(NO_SUBSCRIPTION);
  }
}
