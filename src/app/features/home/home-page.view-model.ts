import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Params } from '@angular/router';
import { switchMap } from 'rxjs';
import { PremiumPlan } from '../../core/api/models/subscription.model';
import { AuthenticationSessionStore } from '../../core/auth/authentication-session.store';
import {
  PremiumPricingStore,
  monthlyEquivalentMinorUnits,
} from '../../core/billing/premium-pricing.store';
import { PremiumStanding } from '../../core/billing/premium-standing';
import { PremiumStandingService } from '../../core/billing/premium-standing.service';
import {
  HomeFeaturesContentService,
  RenderedHomeFeature,
} from '../../core/home-features/home-features-content.service';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  APPLICATION_ROUTE_LINKS,
  APPLICATION_ROUTE_QUERY_PARAMETERS,
} from '../../core/routing/application-route-paths';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';
import { formatPrice } from '../../shared/formatting/price-formatter';

/**
 * The button under one offer column, ready to render.
 *
 * <p>With a {@link routerLink} it is a link; without one it is a statement of where the visitor
 * already stands, and nothing to click.</p>
 */
export interface PresentedOfferAction {
  /** The button's text, in the reader's language. */
  readonly label: string;
  /** Where the button leads, or {@code null} when it is not a link. */
  readonly routerLink: string | null;
  /** The query parameters the link carries, or {@code null} for none. */
  readonly queryParams: Params | null;
}

/**
 * State behind the home page.
 *
 * <p>The page is a presentation, so beyond which selling points to show, the one thing it decides
 * is what the button under each offer says. A visitor nobody knows is offered the extension; a
 * signed-in one is offered what they can still buy, and told what they already have.</p>
 */
@Injectable()
export class HomePageViewModel {
  private readonly sessionStore = inject(AuthenticationSessionStore);
  private readonly premiumStandingService = inject(PremiumStandingService);
  private readonly translationService = inject(TranslationService);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);
  private readonly homeFeaturesContentService = inject(HomeFeaturesContentService);
  private readonly premiumPricingStore = inject(PremiumPricingStore);

  /** The standing as last loaded; {@code UNKNOWN} until then. */
  private readonly loadedPremiumStanding = signal<PremiumStanding>('UNKNOWN');

  /**
   * The standing the offers are decided on.
   *
   * <p>Signing out on this page drops straight back to {@code UNKNOWN}, without waiting for a
   * reload that would never come.</p>
   */
  private readonly premiumStanding = computed<PremiumStanding>(() =>
    this.sessionStore.isSignedIn() ? this.loadedPremiumStanding() : 'UNKNOWN',
  );

  /**
   * The subscription column's heading: its price per month in the selected currency.
   *
   * <p>Per month because that is how a yearly price compares with everything else a visitor pays
   * for; the yearly amount actually charged is said right under it, in
   * {@link subscriptionBillingNote}. Without a price — the offers not in yet, or payments off —
   * the plan is named instead, so the column never shows an invented amount.</p>
   */
  readonly subscriptionPriceHeading = computed<string>(() => {
    const offer = this.premiumPricingStore.offerFor('YEARLY_RECURRING');
    const monthlyAmount = offer ? monthlyEquivalentMinorUnits(offer) : null;
    if (!offer || monthlyAmount === null) {
      return this.translationService.translate('home.downloads.paid.titleWithoutPrice');
    }
    return this.translationService.translate('home.downloads.paid.title', {
      monthlyPrice: this.formatInReaderLanguage(monthlyAmount, offer.currency),
    });
  });

  /** What the subscription actually charges, and how often; empty without a price. */
  readonly subscriptionBillingNote = computed<string>(() => {
    const offer = this.premiumPricingStore.offerFor('YEARLY_RECURRING');
    return offer
      ? this.translationService.translate('home.downloads.paid.billing', {
          yearlyPrice: this.formatInReaderLanguage(offer.amountMinorUnits, offer.currency),
        })
      : '';
  });

  /** The lifetime column's heading: its one-off price, or the plan's name without one. */
  readonly lifetimePriceHeading = computed<string>(() => {
    const offer = this.premiumPricingStore.offerFor('LIFETIME');
    return offer
      ? this.translationService.translate('home.downloads.lifetime.title', {
          price: this.formatInReaderLanguage(offer.amountMinorUnits, offer.currency),
        })
      : this.translationService.translate('home.downloads.lifetime.titleWithoutPrice');
  });

  /**
   * The selling points, rendered from their markdown files, in the order they are shown.
   *
   * <p>Follows the reader's language: switching it fetches the points again, like every other
   * text on the site, and a newer fetch cancels an older one. Empty until they arrive — the page
   * around them needs nothing from them, so there is nothing to wait for.</p>
   */
  readonly presentedFeatures = toSignal(
    toObservable(this.translationService.currentLanguageCode).pipe(
      switchMap((languageCode) =>
        this.homeFeaturesContentService.loadRenderedHomeFeatures(languageCode),
      ),
    ),
    { initialValue: [] as readonly RenderedHomeFeature[] },
  );

  /** The button under the free offer: already on premium, or get the extension. */
  readonly freeOfferAction = computed<PresentedOfferAction>(() => {
    switch (this.premiumStanding()) {
      case 'SUBSCRIBED':
      case 'LIFETIME':
        return this.presentStatement('home.downloads.action.alreadyOnPremium');
      default:
        return this.presentExtensionDownload();
    }
  });

  /** The button under the subscription offer. */
  readonly subscriptionOfferAction = computed<PresentedOfferAction>(() => {
    switch (this.premiumStanding()) {
      case 'FREE':
        return this.presentUpgrade('home.downloads.action.upgradeToPremium', 'YEARLY_RECURRING');
      case 'SUBSCRIBED':
        return this.presentStatement('home.downloads.action.subscribed');
      case 'LIFETIME':
        return this.presentStatement('home.downloads.action.alreadyOnLifetime');
      default:
        return this.presentExtensionDownload();
    }
  });

  /** The button under the lifetime offer. */
  readonly lifetimeOfferAction = computed<PresentedOfferAction>(() => {
    switch (this.premiumStanding()) {
      case 'FREE':
        return this.presentUpgrade('home.downloads.action.upgradeToPremium', 'LIFETIME');
      case 'SUBSCRIBED':
        return this.presentUpgrade('home.downloads.action.upgradeToLifetime', 'LIFETIME');
      case 'LIFETIME':
        return this.presentStatement('home.downloads.action.alreadyOnLifetime');
      default:
        return this.presentExtensionDownload();
    }
  });

  /**
   * Finds out where the visitor stands, so the offers can be tailored.
   *
   * <p>Until it answers, every offer reads as it does to any visitor. That is the right thing to
   * show while waiting — and the right thing to keep showing if it fails.</p>
   */
  loadPremiumStanding(): void {
    this.premiumStandingService
      .loadPremiumStanding()
      .subscribe((premiumStanding) => this.loadedPremiumStanding.set(premiumStanding));
  }

  /**
   * The button every visitor nobody knows is shown: get the extension.
   *
   * @returns the download link
   */
  private presentExtensionDownload(): PresentedOfferAction {
    return {
      label: this.translationService.translate('home.callToAction'),
      routerLink: this.localizedRouteLinks.links().download,
      queryParams: null,
    };
  }

  /**
   * A link to the purchase form on the account page, with the plan already chosen.
   *
   * @param labelTranslationKey what the button says
   * @param preselectedPlan the plan to choose in the form
   * @returns the link to the account page
   */
  private presentUpgrade(
    labelTranslationKey: string,
    preselectedPlan: PremiumPlan,
  ): PresentedOfferAction {
    return {
      label: this.translationService.translate(labelTranslationKey),
      routerLink: APPLICATION_ROUTE_LINKS.account,
      queryParams: { [APPLICATION_ROUTE_QUERY_PARAMETERS.accountPremiumPlan]: preselectedPlan },
    };
  }

  /**
   * Where the visitor already stands, with nothing to click.
   *
   * @param labelTranslationKey what the statement says
   * @returns the statement
   */
  private presentStatement(labelTranslationKey: string): PresentedOfferAction {
    return {
      label: this.translationService.translate(labelTranslationKey),
      routerLink: null,
      queryParams: null,
    };
  }

  /**
   * Spells out a price in the language the page is displayed in.
   *
   * @param amountMinorUnits the price in minor units
   * @param currency ISO 4217 code
   * @returns the formatted price
   */
  private formatInReaderLanguage(amountMinorUnits: number, currency: string): string {
    return formatPrice(amountMinorUnits, currency, this.translationService.currentLanguageCode());
  }
}
