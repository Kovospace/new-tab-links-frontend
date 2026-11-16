import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlanLimits } from '@app/core/api/models/plan-limits.model';
import { COMPILED_PLAN_LIMITS } from '@app/core/plan-limits/compiled-plan-limits';
import { PublishedPlanLimitsStore } from '@app/core/plan-limits/published-plan-limits.store';

/**
 * The numbers the site prints: the compiled ones until the page has rendered and the backend has
 * answered, then the published ones — and the compiled ones again, silently, when it cannot.
 */
describe('PublishedPlanLimitsStore', () => {
  let httpTestingController: HttpTestingController;
  let store: PublishedPlanLimitsStore;

  const raisedFairUse: PlanLimits = { ...COMPILED_PLAN_LIMITS.fairUse, closedTabs: 800 };

  /** Lets the first render happen, which is when the store asks. */
  const renderAndExpectRequest = () => {
    TestBed.tick();
    return httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith('/api/v1/plan-limits'),
    );
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTestingController = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PublishedPlanLimitsStore);
  });

  afterEach(() => httpTestingController.verify());

  it('starts with the compiled limits and asks nothing before the first render', () => {
    expect(store.fairUseLimits()).toEqual(COMPILED_PLAN_LIMITS.fairUse);
    httpTestingController.expectNone((candidate) => candidate.url.endsWith('/api/v1/plan-limits'));
    renderAndExpectRequest().flush({ free: COMPILED_PLAN_LIMITS.free, fairUse: raisedFairUse });
  });

  it('switches to the published Fair Use limits once they arrive, on both outlets', () => {
    let streamed: PlanLimits | undefined;
    store.fairUseLimits$.subscribe((limits) => (streamed = limits));

    renderAndExpectRequest().flush({ free: COMPILED_PLAN_LIMITS.free, fairUse: raisedFairUse });

    expect(store.fairUseLimits().closedTabs).toBe(800);
    expect(streamed?.closedTabs).toBe(800);
  });

  it('keeps the compiled limits when the backend cannot be reached', () => {
    renderAndExpectRequest().flush('', { status: 502, statusText: 'Bad Gateway' });

    expect(store.fairUseLimits()).toEqual(COMPILED_PLAN_LIMITS.fairUse);
  });

  it('keeps the compiled limits when the answer is missing a value', () => {
    const { devices: _missing, ...incomplete } = raisedFairUse;
    renderAndExpectRequest().flush({ free: COMPILED_PLAN_LIMITS.free, fairUse: incomplete });

    expect(store.fairUseLimits()).toEqual(COMPILED_PLAN_LIMITS.fairUse);
  });
});
