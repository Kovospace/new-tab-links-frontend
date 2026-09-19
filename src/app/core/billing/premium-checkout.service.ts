import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  PremiumCheckoutRedirect,
  PremiumCheckoutRequest,
  SubscriptionStatus,
} from '../api/models/subscription.model';

/**
 * Thrown when a purchase or a cancellation is attempted before any payment gate exists.
 *
 * <p>Its own type rather than a bare {@code Error}, so that a view-model can tell "this is not
 * built yet" apart from "the gate said no" and word them differently. It should stop being thrown
 * once a gate is wired up, but it is worth keeping even then: a deployment with no gate
 * configured will want to say exactly this again.</p>
 */
export class PaymentGateUnavailableError extends Error {
  constructor() {
    super('No payment gate is configured yet.');
    this.name = 'PaymentGateUnavailableError';
  }
}

/**
 * Starting and ending a premium subscription.
 *
 * <p><strong>This is a seam, and today it is empty.</strong> No payment gate is contracted, the
 * backend has no billing endpoints, and both calls fail with {@link PaymentGateUnavailableError}.
 * The signatures are the ones the backend's proposed contract implies, so that when it ships,
 * these two method bodies become {@code BackendApiClient} calls and the form, the view-model, the
 * validation, the country catalogue and the wording all stay exactly as they are.</p>
 *
 * <p>The point is that there is exactly <em>one</em> place to change. Callers must not work
 * around this class while it is unimplemented — a second path to the gate is how a seam stops
 * being one. The endpoint paths are deliberately not in {@code api-endpoint-paths.ts} yet: they
 * are still proposals, and a constant nothing calls is a constant nobody maintains.</p>
 *
 * <p>Note what is deliberately <em>not</em> here: anything that talks to a payment provider
 * directly. The browser only ever learns a URL to visit. Card details, gate credentials and the
 * webhook the gate calls back on all belong to the backend, and a website that never sees them
 * cannot leak them. In particular the webhook is what grants premium — never the browser coming
 * back from the gate, whose return URL carries no authority at all.</p>
 */
@Injectable({ providedIn: 'root' })
export class PremiumCheckoutService {
  /**
   * Starts a purchase and answers where to send the browser.
   *
   * @param checkoutRequest what is being bought, and where the buyer says they are
   * @returns the gate's hosted payment page to redirect to
   */
  beginCheckout(checkoutRequest: PremiumCheckoutRequest): Observable<PremiumCheckoutRedirect> {
    void checkoutRequest;
    return throwError(() => new PaymentGateUnavailableError());
  }

  /**
   * Withdraws from the purchase and asks for the money back.
   *
   * <p>Distinct from cancelling, and not a gentler version of it. Cancelling stops the next
   * renewal and lets the paid period run out; this undoes the purchase itself, returns the whole
   * amount and ends the premium access now. It is the buyer exercising a statutory right rather
   * than changing their mind about the future.</p>
   *
   * <p>The website only ever sends the request. The money is moved by the payment gate, through
   * the backend — a browser cannot be trusted to say how much to return, or to whom.</p>
   *
   * @returns the subscription's standing once the purchase has been withdrawn
   */
  requestRefund(): Observable<SubscriptionStatus> {
    return throwError(() => new PaymentGateUnavailableError());
  }

  /**
   * Stops a renewing subscription from renewing.
   *
   * <p>Cancelling is not a refund and not a deletion: the account stays premium until the period
   * already paid for runs out, which is why the backend models it as
   * {@code POST /api/v1/billing/subscription/cancel} rather than a {@code DELETE}. A lifetime
   * purchase has nothing to renew, which is why the backend reports it as not cancellable.</p>
   *
   * @returns the subscription's standing once the renewal has been stopped
   */
  cancelSubscription(): Observable<SubscriptionStatus> {
    return throwError(() => new PaymentGateUnavailableError());
  }
}
