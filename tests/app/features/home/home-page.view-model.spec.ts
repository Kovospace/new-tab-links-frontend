import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthenticationSessionStore } from '@app/core/auth/authentication-session.store';
import { PremiumStanding } from '@app/core/billing/premium-standing';
import { PremiumStandingService } from '@app/core/billing/premium-standing.service';
import { HomeFeaturesContentService } from '@app/core/home-features/home-features-content.service';
import { HomePageViewModel, PresentedOfferAction } from '@app/features/home/home-page.view-model';

/**
 * What the button under each offer says and where it leads, for every premium standing.
 */
describe('HomePageViewModel', () => {
  const isSignedIn = signal(true);
  let standing: PremiumStanding;
  let viewModel: HomePageViewModel;

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
    TestBed.configureTestingModule({
      providers: [
        HomePageViewModel,
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
});
