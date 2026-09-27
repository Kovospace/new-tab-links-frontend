import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IsActiveMatchOptions, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';
import { AuthenticationSessionStore } from '../../../core/auth/authentication-session.store';
import { AuthenticationService } from '../../../core/auth/authentication.service';
import { TranslationService } from '../../../core/i18n/translation.service';

/**
 * One entry of the top navigation, ready to render.
 */
export interface NavigationEntry {
  /** Translation key of the entry's label. */
  readonly labelTranslationKey: string;
  /** Absolute router link the entry points at. */
  readonly routerLink: string;
  /** When the entry is shown as the current page; see {@link MATCHES_ITS_PAGES_BELOW}. */
  readonly activeWhen: IsActiveMatchOptions;
}

/**
 * The entry is current on its own page only.
 *
 * <p>Home's alone: its path is {@code /}, which every address in the site starts with, so matching
 * anything wider would light it up everywhere.</p>
 */
const MATCHES_ITS_OWN_PAGE: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

/**
 * The entry is current on its page and every page below it — Tips on {@code /tips/<slug>} as well
 * as on {@code /tips}.
 *
 * <p>Query parameters are ignored, so Account stays current on {@code /account?plan=LIFETIME},
 * which is where the home page's offers link. Paths are compared by segment, not as text:
 * {@code /tips} is not current on a {@code /tipsy}.</p>
 */
const MATCHES_ITS_PAGES_BELOW: IsActiveMatchOptions = {
  paths: 'subset',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'ignored',
};

/**
 * State and behaviour behind the top bar.
 *
 * <p>The navigation differs for a signed-in user, and deciding which entries to show is exactly
 * the kind of choice the project keeps out of templates: the template renders whatever list this
 * view-model hands it and asks no questions.</p>
 */
@Injectable()
export class PageHeaderViewModel {
  private readonly sessionStore = inject(AuthenticationSessionStore);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  /**
   * Whether the narrow-screen menu is currently open.
   *
   * <p>Held here rather than in the component because it is state the view merely reflects, and
   * because it has to be readable by the label below and writable by the navigation subscription.
   * On a wide screen it is simply ignored: the menu is always visible there, and no width is
   * measured in TypeScript — the stylesheet alone decides which layout applies.</p>
   */
  private readonly mobileMenuOpen = signal(false);

  /** Whether the narrow-screen menu is open, for the template to reflect. */
  readonly isMobileMenuOpen = this.mobileMenuOpen.asReadonly();

  /**
   * What the menu button announces to assistive technology.
   *
   * <p>The button carries no text of its own — it is three lines — so this is the only thing that
   * names it. It says what pressing it will <em>do</em>, which is why it flips with the state.</p>
   */
  readonly mobileMenuToggleLabel = computed<string>(() =>
    this.translationService.translate(this.mobileMenuOpen() ? 'nav.closeMenu' : 'nav.openMenu'),
  );

  /** Whether the visitor holds a session, which is what the top bar changes shape for. */
  readonly isSignedIn = this.sessionStore.isSignedIn;

  /** Name to greet the signed-in user by; empty when nobody is signed in. */
  readonly signedInUserLabel = this.sessionStore.signedInUserLabel;

  /**
   * The navigation entries to render, in order.
   *
   * <p>An anonymous visitor is offered the way in — register and log in. A signed-in one is
   * offered what only makes sense with a session, and the two entries that would make no sense
   * disappear rather than being disabled.</p>
   */
  readonly navigationEntries = computed<readonly NavigationEntry[]>(() =>
    this.isSignedIn() ? SIGNED_IN_NAVIGATION_ENTRIES : ANONYMOUS_NAVIGATION_ENTRIES,
  );

  /**
   * Closes the narrow-screen menu whenever a navigation completes.
   *
   * <p>Every way of leaving the page is covered by this one subscription — tapping an entry, the
   * browser's back button, or a redirect the application performs itself — where handling the
   * click alone would leave the menu covering the page it just navigated to.</p>
   */
  constructor() {
    this.router.events
      .pipe(
        filter((routerEvent) => routerEvent instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMobileMenu());
  }

  /** Opens the narrow-screen menu if it is closed, closes it if it is open. */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  /** Closes the narrow-screen menu, whatever state it was in. */
  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  /**
   * Ends the session and returns the visitor to the home page.
   *
   * <p>Navigates whatever the backend answers, because the local session is cleared either way
   * and leaving the user on a page that needs one would only produce failed requests.</p>
   */
  signOut(): void {
    this.authenticationService.signOut().subscribe({
      next: () => void this.router.navigate([APPLICATION_ROUTE_LINKS.home]),
      error: () => void this.router.navigate([APPLICATION_ROUTE_LINKS.home]),
    });
  }
}

/** What a visitor without a session is offered. */
const ANONYMOUS_NAVIGATION_ENTRIES: readonly NavigationEntry[] = [
  {
    labelTranslationKey: 'nav.home',
    routerLink: APPLICATION_ROUTE_LINKS.home,
    activeWhen: MATCHES_ITS_OWN_PAGE,
  },
  {
    labelTranslationKey: 'nav.download',
    routerLink: APPLICATION_ROUTE_LINKS.download,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.tips',
    routerLink: APPLICATION_ROUTE_LINKS.tips,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.register',
    routerLink: APPLICATION_ROUTE_LINKS.register,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.login',
    routerLink: APPLICATION_ROUTE_LINKS.login,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
];

/** What a visitor holding a session is offered. */
const SIGNED_IN_NAVIGATION_ENTRIES: readonly NavigationEntry[] = [
  {
    labelTranslationKey: 'nav.home',
    routerLink: APPLICATION_ROUTE_LINKS.home,
    activeWhen: MATCHES_ITS_OWN_PAGE,
  },
  {
    labelTranslationKey: 'nav.download',
    routerLink: APPLICATION_ROUTE_LINKS.download,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.tips',
    routerLink: APPLICATION_ROUTE_LINKS.tips,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.devices',
    routerLink: APPLICATION_ROUTE_LINKS.devices,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
  {
    labelTranslationKey: 'nav.account',
    routerLink: APPLICATION_ROUTE_LINKS.account,
    activeWhen: MATCHES_ITS_PAGES_BELOW,
  },
];
