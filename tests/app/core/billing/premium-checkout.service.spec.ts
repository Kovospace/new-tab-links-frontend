import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PaymentGateUnavailableError,
  PremiumCheckoutService,
} from '@app/core/billing/premium-checkout.service';

/**
 * Starting a purchase: what reaches the backend, and how its refusals come back.
 */
describe('PremiumCheckoutService', () => {
  let premiumCheckoutService: PremiumCheckoutService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    premiumCheckoutService = TestBed.inject(PremiumCheckoutService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('asks the backend for a checkout, naming the renewing plan the way the backend does', () => {
    let checkoutUrl = '';
    premiumCheckoutService
      .beginCheckout('YEARLY_RECURRING', 'EUR')
      .subscribe((checkoutSession) => (checkoutUrl = checkoutSession.checkoutUrl));

    const request = httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith('/api/v1/payments/checkouts'),
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ plan: 'SUBSCRIPTION', currency: 'EUR' });

    request.flush({ checkoutUrl: 'https://checkout.creem.io/ch_test' });
    expect(checkoutUrl).toBe('https://checkout.creem.io/ch_test');
  });

  it('sends lifetime as lifetime', () => {
    premiumCheckoutService.beginCheckout('LIFETIME', 'USD').subscribe();

    const request = httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith('/api/v1/payments/checkouts'),
    );
    expect(request.request.body).toEqual({ plan: 'LIFETIME', currency: 'USD' });
    request.flush({ checkoutUrl: 'https://checkout.creem.io/ch_test' });
  });

  it('reports a backend with no payment provider as the gate being unavailable', () => {
    let failure: unknown;
    premiumCheckoutService
      .beginCheckout('LIFETIME', 'USD')
      .subscribe({ error: (error) => (failure = error) });

    httpTestingController
      .expectOne((candidate) => candidate.url.endsWith('/api/v1/payments/checkouts'))
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(failure).toBeInstanceOf(PaymentGateUnavailableError);
  });

  it('passes every other failure on as it came', () => {
    let failure: unknown;
    premiumCheckoutService
      .beginCheckout('LIFETIME', 'USD')
      .subscribe({ error: (error) => (failure = error) });

    httpTestingController
      .expectOne((candidate) => candidate.url.endsWith('/api/v1/payments/checkouts'))
      .flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect((failure as HttpErrorResponse).status).toBe(502);
  });
});
