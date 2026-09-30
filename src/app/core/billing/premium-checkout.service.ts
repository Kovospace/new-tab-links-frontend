import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import {
  CheckoutPlan,
  PremiumCheckoutRequest,
  PremiumCheckoutSession,
  PremiumPlan,
  SubscriptionStatus,
} from '../api/models/subscription.model';

/**
 * Thrown when a purchase or a cancellation is attempted and no payment gate is there to take it.
 *
 * <p>Its own type rather than a bare {@code Error}, so that a view-model can tell "this is not
 * built yet" apart from "the gate said no" and word them differently. It should stop being thrown
 * for a purchase when the backend has no Creem key configured, and it stays thrown by refund and
 * cancellation until those are built.</p>
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
 * <p><strong>Buying is wired; refunding and cancelling are not yet.</strong> A purchase asks the
 * backend for a checkout, and the backend builds it from the product ids in its own configuration
 * and puts the account's id inside it — which is how the webhook knows whom to make premium. The
 * product payment links in Creem's dashboard are deliberately not used: they carry no account, so
 * a payment through one would have nobody to credit it to, and their ids would be one more thing
 * to keep in step per environment. Refund and cancel still fail with
 * {@link PaymentGateUnavailableError} until the backend has endpoints for them.</p>
 *
 * <p>Note what is deliberately <em>not</em> here: anything that talks to a payment provider
 * directly. The browser only ever learns a URL to visit. Card details, gate credentials and the
 * webhook the gate calls back on all belong to the backend, and a website that never sees them
 * cannot leak them. In particular the webhook is what grants premium — never the browser coming
 * back from the gate, whose return URL carries no authority at all.</p>
 */
@Injectable({ providedIn: 'root' })
export class PremiumCheckoutService {
  private readonly backendApiClient = inject(BackendApiClient);

  /**
   * Starts a purchase and answers where to send the browser.
   *
   * <p>A 503 means the backend has no payment provider configured, and becomes
   * {@link PaymentGateUnavailableError} so the reader is told that rather than shown a server
   * error. Everything else is passed on as it came.</p>
   *
   * @param plan what is being bought
   * @param currency ISO 4217 code of the currency to pay in
   * @returns the hosted payment page to redirect to
   */
  beginCheckout(plan: PremiumPlan, currency: string): Observable<PremiumCheckoutSession> {
    const checkoutRequest: PremiumCheckoutRequest = { plan: toCheckoutPlan(plan), currency };

    return this.backendApiClient
      .post<PremiumCheckoutSession>(API_ENDPOINT_PATHS.payments.checkouts, checkoutRequest)
      .pipe(catchError((failure: unknown) => throwError(() => explainCheckoutFailure(failure))));
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

/**
 * Names a plan the way the backend's checkout does.
 *
 * @param plan the plan as the rest of the website names it
 * @returns the same plan as {@code POST /api/v1/payments/checkouts} expects it
 */
export function toCheckoutPlan(plan: PremiumPlan): CheckoutPlan {
  return plan === 'LIFETIME' ? 'LIFETIME' : 'SUBSCRIPTION';
}

/**
 * Turns "no payment provider configured" into its own error, and leaves every other failure as is.
 *
 * @param failure whatever the checkout call failed with
 * @returns the error to pass on
 */
function explainCheckoutFailure(failure: unknown): unknown {
  const noGateConfigured =
    failure instanceof HttpErrorResponse && failure.status === HttpStatusCode.ServiceUnavailable;
  return noGateConfigured ? new PaymentGateUnavailableError() : failure;
}
