import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { NO_SUBSCRIPTION } from '../api/models/subscription.model';
import { AuthenticationSessionStore } from '../auth/authentication-session.store';
import { UserAccountService } from '../user/user-account.service';
import { PremiumStanding, resolvePremiumStanding } from './premium-standing';
import { SubscriptionService } from './subscription.service';

/**
 * The signed-in visitor's premium standing, for pages that are not about the account.
 *
 * <p>The account page loads the account and the subscription for its own reasons and resolves the
 * standing from them itself. A page that only wants to tailor an offer — the home page — should
 * not have to know that it takes two calls, or which one is allowed to fail.</p>
 */
@Injectable({ providedIn: 'root' })
export class PremiumStandingService {
  private readonly sessionStore = inject(AuthenticationSessionStore);
  private readonly userAccountService = inject(UserAccountService);
  private readonly subscriptionService = inject(SubscriptionService);

  /**
   * Loads where the visitor stands.
   *
   * <p>Nobody signed in costs no call at all. Any failure degrades to {@code UNKNOWN}, which shows
   * the offers as any visitor sees them: an offer page must never break because billing did. A
   * failed subscription alone degrades to "nothing bought", so a premium account whose plan cannot
   * be read still counts as premium.</p>
   *
   * @returns the visitor's premium standing
   */
  loadPremiumStanding(): Observable<PremiumStanding> {
    if (!this.sessionStore.isSignedIn()) {
      return of('UNKNOWN');
    }

    return forkJoin({
      account: this.userAccountService.loadMyAccount(),
      subscription: this.subscriptionService
        .loadMySubscription()
        .pipe(catchError(() => of(NO_SUBSCRIPTION))),
    }).pipe(
      map(({ account, subscription }) => resolvePremiumStanding(account, subscription)),
      catchError(() => of<PremiumStanding>('UNKNOWN')),
    );
  }
}
