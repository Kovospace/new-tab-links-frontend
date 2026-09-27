import { Injectable, computed, inject, signal } from '@angular/core';
import { Params } from '@angular/router';
import { PremiumPlan } from '../../core/api/models/subscription.model';
import { AuthenticationSessionStore } from '../../core/auth/authentication-session.store';
import { PremiumStanding } from '../../core/billing/premium-standing';
import { PremiumStandingService } from '../../core/billing/premium-standing.service';
import { TranslationService } from '../../core/i18n/translation.service';
import {
  APPLICATION_ROUTE_LINKS,
  APPLICATION_ROUTE_QUERY_PARAMETERS,
} from '../../core/routing/application-route-paths';

/**
 * One selling point of the extension, ready to render.
 */
export interface PresentedFeature {
  /** Translation key of the feature's title. */
  readonly titleTranslationKey: string;
  /** Translation key of the feature's description. */
  readonly textTranslationKey: string;
}

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

  /** The selling points, in the order they are shown. */
  readonly presentedFeatures: readonly PresentedFeature[] = [
    {
      titleTranslationKey: 'home.features.groupsTitle',
      textTranslationKey: 'home.features.groupsText',
    },
    {
      titleTranslationKey: 'home.features.subgroupsTitle',
      textTranslationKey: 'home.features.subgroupsText',
    },
    {
      titleTranslationKey: 'home.features.workspacesTitle',
      textTranslationKey: 'home.features.workspacesText',
    },
    {
      titleTranslationKey: 'home.features.syncTitle',
      textTranslationKey: 'home.features.syncText',
    },
  ];

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
      routerLink: APPLICATION_ROUTE_LINKS.download,
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
}
