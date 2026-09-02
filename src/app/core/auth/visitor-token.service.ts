import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
  timer,
} from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { VisitorToken } from '../api/models/visitor-token.model';

/**
 * Status the backend answers with when a pass has to be replaced.
 *
 * <p>Distinct from 429, which means the pass is fine and the caller was early. Replacing a pass
 * on 429 would turn a throttle into a retry storm, which is why the two are told apart here
 * rather than treated as one failure.</p>
 */
const PASS_MUST_BE_REPLACED_STATUS = 401;

/**
 * How long before a pass expires it stops being reused.
 *
 * <p>A pass that expires between being chosen and arriving at the backend is refused, costing a
 * round trip and a retry. Half a minute is far longer than that gap and far shorter than the
 * pass's own lifetime, so it never causes a re-issue that would not have happened anyway.</p>
 */
const EXPIRY_SAFETY_MARGIN_MILLISECONDS = 30_000;

/**
 * A pass, as this site tracks it: what the backend said, plus when it was actually used.
 */
interface TrackedPass {
  /** The value to send in the header. */
  readonly token: string;

  /** Epoch milliseconds at which the pass stops working. */
  readonly expiresAtMilliseconds: number;

  /** Epoch milliseconds before which the first call must not be made. */
  readonly earliestFirstUseMilliseconds: number;

  /** Shortest gap the backend allows between two calls with this pass. */
  readonly minimumRequestIntervalMilliseconds: number;

  /** Epoch milliseconds of the last call made with it, or 0 while it is unused. */
  lastUsedAtMilliseconds: number;
}

/**
 * Obtains and paces the metered pass the backend's enumerable endpoints ask for.
 *
 * <p>Registration refuses a taken username with 409, and the lookup behind the registration
 * form answers the same question directly, so the backend meters both: a caller must present a
 * pass, may not spend it the instant it was issued, may not spend it faster than a person types,
 * and may spend it only so many times before asking for another. This service is the whole of
 * this site's half of that bargain.</p>
 *
 * <p><strong>It waits rather than gets refused.</strong> The backend's answer to going too fast
 * is 429, which for the username lookup would mean a missing answer and for registration a
 * failed submission — both of them a worse experience than the few hundred milliseconds it takes
 * to be within the rules. So the delay is served here, before the request, and a 429 becomes
 * something this site should never provoke.</p>
 *
 * <p><strong>A pass that cannot be obtained is not fatal.</strong> Failing to issue one resolves
 * to no pass and the call goes out without the header, because the alternative — refusing to
 * submit a registration this site could have submitted — is the worse of the two failures. A
 * backend that demands a pass will answer 401 and say so; one that does not, or has the throttle
 * switched off, serves the request exactly as before.</p>
 */
@Injectable({ providedIn: 'root' })
export class VisitorTokenService {
  private readonly backendApiClient = inject(BackendApiClient);

  /** The pass in hand, or null when there is none yet or the last one was discarded. */
  private currentPass: TrackedPass | null = null;

  /**
   * The issue request currently in flight, shared by everything waiting for it.
   *
   * <p>Without this, a form that fires several checks in quick succession on a cold start would
   * ask for a pass once per check and keep only the last — spending rows on the backend for
   * passes nobody uses.</p>
   */
  private passBeingIssued: Observable<TrackedPass | null> | null = null;

  /**
   * Runs one backend call with a pass, obtaining and pacing one as needed.
   *
   * <p>Retries exactly once, and only when the backend says the pass itself has to be replaced.
   * Once: a second failure is a real one — a backend that refuses freshly issued passes is
   * broken or hostile, and a client that keeps asking makes it worse.</p>
   *
   * @param performCall makes the actual request with the pass to present, if any
   * @returns whatever the call returns
   */
  runWithVisitorToken<TResponse>(
    performCall: (visitorToken: string | undefined) => Observable<TResponse>,
  ): Observable<TResponse> {
    return this.performOnce(performCall).pipe(
      catchError((failure: unknown) => {
        if (!VisitorTokenService.meansThePassMustBeReplaced(failure)) {
          return throwError(() => failure);
        }
        this.currentPass = null;
        return this.performOnce(performCall);
      }),
    );
  }

  /**
   * Makes one attempt: hold a pass, wait for its turn, then call.
   *
   * @param performCall makes the actual request with the pass to present, if any
   * @returns whatever the call returns
   */
  private performOnce<TResponse>(
    performCall: (visitorToken: string | undefined) => Observable<TResponse>,
  ): Observable<TResponse> {
    return this.obtainPass().pipe(
      switchMap((pass) => this.waitForItsTurn(pass)),
      switchMap((pass) => {
        if (pass === null) {
          return performCall(undefined);
        }
        pass.lastUsedAtMilliseconds = Date.now();
        return performCall(pass.token);
      }),
    );
  }

  /**
   * Returns a usable pass, issuing one when there is none.
   *
   * @returns the pass, or null when one could not be obtained
   */
  private obtainPass(): Observable<TrackedPass | null> {
    if (this.currentPass !== null && this.isStillUsable(this.currentPass)) {
      return of(this.currentPass);
    }
    if (this.passBeingIssued !== null) {
      return this.passBeingIssued;
    }

    this.passBeingIssued = this.backendApiClient
      .post<VisitorToken>(API_ENDPOINT_PATHS.auth.visitorToken, null, {
        withoutAuthorization: true,
      })
      .pipe(
        map((issued) => this.trackIssuedPass(issued)),
        catchError(() => of(null)),
        finalize(() => (this.passBeingIssued = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.passBeingIssued;
  }

  /**
   * Turns what the backend issued into what this site tracks, and keeps it.
   *
   * @param issuedPass the backend's answer
   * @returns the tracked pass
   */
  private trackIssuedPass(issuedPass: VisitorToken): TrackedPass {
    const issuedAtMilliseconds = Date.now();
    this.currentPass = {
      token: issuedPass.token,
      expiresAtMilliseconds: Date.parse(issuedPass.expiresAt),
      earliestFirstUseMilliseconds:
        issuedAtMilliseconds + issuedPass.minimumFirstUseDelayMilliseconds,
      minimumRequestIntervalMilliseconds: issuedPass.minimumRequestIntervalMilliseconds,
      lastUsedAtMilliseconds: 0,
    };
    return this.currentPass;
  }

  /**
   * Delays until the pass may be spent, or passes straight through when it already may.
   *
   * @param pass the pass about to be spent, or null when there is none
   * @returns the same pass, once its turn has come
   */
  private waitForItsTurn(pass: TrackedPass | null): Observable<TrackedPass | null> {
    if (pass === null) {
      return of(null);
    }

    const waitMilliseconds = Math.max(
      0,
      pass.lastUsedAtMilliseconds === 0
        ? pass.earliestFirstUseMilliseconds - Date.now()
        : pass.lastUsedAtMilliseconds + pass.minimumRequestIntervalMilliseconds - Date.now(),
    );

    return waitMilliseconds > 0 ? timer(waitMilliseconds).pipe(map(() => pass)) : of(pass);
  }

  /**
   * Whether a pass is worth presenting rather than replacing.
   *
   * <p>Judged on expiry only. The backend also counts uses, but it is the authority on that
   * count and says so with a 401, which
   * {@link runWithVisitorToken} already handles — mirroring the counter here would only create a
   * second, occasionally wrong opinion about the same number.</p>
   *
   * @param pass the pass in hand
   * @returns true while it is worth presenting
   */
  private isStillUsable(pass: TrackedPass): boolean {
    return Date.now() + EXPIRY_SAFETY_MARGIN_MILLISECONDS < pass.expiresAtMilliseconds;
  }

  /**
   * Whether a failure means the pass has to be replaced.
   *
   * @param failure whatever the call threw
   * @returns true for the backend's "obtain a new pass" answer, false for everything else
   */
  private static meansThePassMustBeReplaced(failure: unknown): boolean {
    return failure instanceof HttpErrorResponse && failure.status === PASS_MUST_BE_REPLACED_STATUS;
  }
}
