import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NO_SUBSCRIPTION, SubscriptionStatus } from '@app/core/api/models/subscription.model';
import { SubscriptionService } from '@app/core/billing/subscription.service';

/**
 * Loading the account's subscription from the backend.
 */
describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    subscriptionService = TestBed.inject(SubscriptionService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('reads the subscription from the payment module', () => {
    const lifetime: SubscriptionStatus = {
      ...NO_SUBSCRIPTION,
      plan: 'LIFETIME',
      state: 'ACTIVE',
      startedAt: '2026-09-27T10:00:00Z',
    };
    let loaded: SubscriptionStatus | undefined;
    subscriptionService.loadMySubscription().subscribe((status) => (loaded = status));

    const request = httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith('/api/v1/payments/subscription'),
    );
    expect(request.request.method).toBe('GET');
    request.flush(lifetime);

    expect(loaded).toEqual(lifetime);
  });
});
