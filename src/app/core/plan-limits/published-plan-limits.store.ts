import { Injectable, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { PlanLimits, PublishedPlanLimits } from '../api/models/plan-limits.model';
import { COMPILED_PLAN_LIMITS } from './compiled-plan-limits';

/**
 * The plan limits the site prints — the Fair Use Policy, the offers on the home page, a few tips
 * — as the backend currently enforces them.
 *
 * <p>The operator can change the Fair Use values without a release, so a number compiled into the
 * site would sooner or later be wrong. Pages are pre-rendered with {@link COMPILED_PLAN_LIMITS}
 * (no backend exists at build time), and once the page is running in a browser the published
 * values are asked for once and replace them. A failure keeps the compiled ones without saying
 * anything: they are what the backend shipped with, and a policy page that shows the defaults is
 * better than one that shows an error.</p>
 *
 * <p>Asked for after the first render rather than when the store is created, so that a
 * pre-rendered page hydrates against exactly the numbers it was rendered with and changes only
 * afterwards. On the server {@code afterNextRender} never runs, so no request is attempted there
 * at all.</p>
 *
 * <p>Exposed both as a signal, for view-models that compute, and as an observable, for the
 * markdown pages that already render through a stream; both start with the compiled values
 * synchronously.</p>
 */
@Injectable({ providedIn: 'root' })
export class PublishedPlanLimitsStore {
  private readonly backendApiClient = inject(BackendApiClient);

  /** The Fair Use limits in force, the compiled ones until the backend has answered. */
  private readonly fairUseLimitsSubject = new BehaviorSubject<PlanLimits>(
    COMPILED_PLAN_LIMITS.fairUse,
  );

  /** The Fair Use limits in force, as a stream that emits again when the backend answers. */
  readonly fairUseLimits$: Observable<PlanLimits> = this.fairUseLimitsSubject.asObservable();

  /** The Fair Use limits in force, as a signal. */
  readonly fairUseLimits = toSignal(this.fairUseLimitsSubject, { requireSync: true });

  constructor() {
    afterNextRender(() => this.loadPublishedPlanLimits());
  }

  /** Asks the backend once; a failure leaves the compiled limits in place. */
  private loadPublishedPlanLimits(): void {
    this.backendApiClient
      .get<PublishedPlanLimits>(API_ENDPOINT_PATHS.planLimits, undefined, {
        withoutAuthorization: true,
      })
      .subscribe({
        next: (published) => {
          if (isCompletePlanLimits(published?.fairUse)) {
            this.fairUseLimitsSubject.next(published.fairUse);
          }
        },
        error: () => undefined,
      });
  }
}

/**
 * Whether an answer carries every limit as a positive whole number.
 *
 * <p>An older backend, or a proxy's error page, must not put {@code undefined} into a policy.</p>
 *
 * @param candidate what arrived
 * @returns true when all eight limits are usable
 */
function isCompletePlanLimits(candidate: unknown): candidate is PlanLimits {
  if (typeof candidate !== 'object' || candidate === null) {
    return false;
  }
  const values = candidate as Record<string, unknown>;
  return Object.keys(COMPILED_PLAN_LIMITS.fairUse).every(
    (limitName) =>
      typeof values[limitName] === 'number' &&
      Number.isInteger(values[limitName]) &&
      (values[limitName] as number) >= 1,
  );
}
