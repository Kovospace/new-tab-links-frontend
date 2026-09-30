import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { PremiumOffer } from '@app/core/api/models/premium-offer.model';
import { PremiumPlan } from '@app/core/api/models/subscription.model';
import { AuthenticationSessionStore } from '@app/core/auth/authentication-session.store';
import { PremiumPricingStore } from '@app/core/billing/premium-pricing.store';
import { PremiumStanding } from '@app/core/billing/premium-standing';
import { PremiumStandingService } from '@app/core/billing/premium-standing.service';
import { HomeFeaturesContentService } from '@app/core/home-features/home-features-content.service';
import { TranslationService } from '@app/core/i18n/translation.service';
import { HomePageViewModel, PresentedOfferAction } from '@app/features/home/home-page.view-model';

/**
 * What the button under each offer says and where it leads, for every premium standing.
 */
describe('HomePageViewModel', () => {
  const isSignedIn = signal(true);
  let standing: PremiumStanding;
  let viewModel: HomePageViewModel;
  const pricedOffers = signal<readonly PremiumOffer[]>([]);

  const offers = (): Record<'free' | 'subscription' | 'lifetime', PresentedOfferAction> => ({
    free: viewModel.freeOfferAction(),
    subscription: viewModel.subscriptionOfferAction(),
    lifetime: viewModel.lifetimeOfferAction(),
  });

  const loadWith = (premiumStanding: PremiumStanding): void => {
    standing = premiumStanding;
    viewModel.loadPremiumStanding();
  };

  beforeEach(() => {
    isSignedIn.set(true);
    pricedOffers.set([]);
    TestBed.configureTestingModule({
      providers: [
        HomePageViewModel,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: PremiumPricingStore,
          useValue: {
            offerFor: (plan: PremiumPlan) =>
              pricedOffers().find(
                (offer) => offer.plan === (plan === 'LIFETIME' ? 'LIFETIME' : 'SUBSCRIPTION'),
              ) ?? null,
          },
        },
        { provide: AuthenticationSessionStore, useValue: { isSignedIn } },
        { provide: PremiumStandingService, useValue: { loadPremiumStanding: () => of(standing) } },
        {
          provide: HomeFeaturesContentService,
          useValue: { loadRenderedHomeFeatures: () => of([]) },
        },
      ],
    });
    viewModel = TestBed.inject(HomePageViewModel);
  });

  it('offers the extension everywhere to a visitor nobody knows', () => {
    loadWith('UNKNOWN');

    for (const action of Object.values(offers())) {
      expect(action).toEqual({
        label: 'home.callToAction',
        routerLink: '/download',
        queryParams: null,
      });
    }
  });

  it('links a free account to the purchase form with the clicked plan chosen', () => {
    loadWith('FREE');

    expect(offers().free.routerLink).toBe('/download');
    expect(offers().subscription).toEqual({
      label: 'home.downloads.action.upgradeToPremium',
      routerLink: '/account',
      queryParams: { plan: 'YEARLY_RECURRING' },
    });
    expect(offers().lifetime).toEqual({
      label: 'home.downloads.action.upgradeToPremium',
      routerLink: '/account',
      queryParams: { plan: 'LIFETIME' },
    });
  });

  it('tells a subscriber they are subscribed, and offers the move to lifetime', () => {
    loadWith('SUBSCRIBED');

    expect(offers().free).toEqual({
      label: 'home.downloads.action.alreadyOnPremium',
      routerLink: null,
      queryParams: null,
    });
    expect(offers().subscription.label).toBe('home.downloads.action.subscribed');
    expect(offers().subscription.routerLink).toBeNull();
    expect(offers().lifetime).toEqual({
      label: 'home.downloads.action.upgradeToLifetime',
      routerLink: '/account',
      queryParams: { plan: 'LIFETIME' },
    });
  });

  it('offers a lifetime buyer nothing to click', () => {
    loadWith('LIFETIME');

    expect(offers().free.label).toBe('home.downloads.action.alreadyOnPremium');
    expect(offers().subscription.label).toBe('home.downloads.action.alreadyOnLifetime');
    expect(offers().lifetime.label).toBe('home.downloads.action.alreadyOnLifetime');
    for (const action of Object.values(offers())) {
      expect(action.routerLink).toBeNull();
    }
  });

  it('forgets the standing the moment the visitor signs out', () => {
    loadWith('LIFETIME');
    isSignedIn.set(false);

    expect(offers().lifetime.routerLink).toBe('/download');
  });

  describe('prices', () => {
    const dollarOffers: readonly PremiumOffer[] = [
      { plan: 'SUBSCRIPTION', currency: 'USD', amountMinorUnits: 588, billingPeriod: 'P1Y' },
      { plan: 'LIFETIME', currency: 'USD', amountMinorUnits: 1599, billingPeriod: null },
    ];

    beforeEach(async () => {
      const loadingEnglish = TestBed.inject(TranslationService).changeLanguage('en');
      TestBed.inject(HttpTestingController)
        .expectOne('i18n/en.json')
        .flush({
          home: {
            downloads: {
              paid: {
                title: '{monthlyPrice} / month',
                titleWithoutPrice: 'PREMIUM',
                billing: '* billed annually, {yearlyPrice} per year',
              },
              lifetime: { title: '{price} LIFETIME', titleWithoutPrice: 'LIFETIME' },
            },
          },
        });
      await loadingEnglish;
    });

    it('heads the subscription with its price per month, and says what a year costs', () => {
      pricedOffers.set(dollarOffers);

      expect(viewModel.subscriptionPriceHeading()).toBe('$0.49 / month');
      expect(viewModel.subscriptionBillingNote()).toBe('* billed annually, $5.88 per year');
      expect(viewModel.lifetimePriceHeading()).toBe('$15.99 LIFETIME');
    });

    it('names the plans without an amount while no price is known', () => {
      expect(viewModel.subscriptionPriceHeading()).toBe('PREMIUM');
      expect(viewModel.subscriptionBillingNote()).toBe('');
      expect(viewModel.lifetimePriceHeading()).toBe('LIFETIME');
    });
  });
});
