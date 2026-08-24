import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';
import { AuthenticationSessionStore } from '../../../core/auth/authentication-session.store';
import { AuthenticationService } from '../../../core/auth/authentication.service';

/**
 * One entry of the top navigation, ready to render.
 */
export interface NavigationEntry {
  /** Translation key of the entry's label. */
  readonly labelTranslationKey: string;
  /** Absolute router link the entry points at. */
  readonly routerLink: string;
}

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
  { labelTranslationKey: 'nav.home', routerLink: APPLICATION_ROUTE_LINKS.home },
  { labelTranslationKey: 'nav.download', routerLink: APPLICATION_ROUTE_LINKS.download },
  { labelTranslationKey: 'nav.register', routerLink: APPLICATION_ROUTE_LINKS.register },
  { labelTranslationKey: 'nav.login', routerLink: APPLICATION_ROUTE_LINKS.login },
];

/** What a visitor holding a session is offered. */
const SIGNED_IN_NAVIGATION_ENTRIES: readonly NavigationEntry[] = [
  { labelTranslationKey: 'nav.home', routerLink: APPLICATION_ROUTE_LINKS.home },
  { labelTranslationKey: 'nav.download', routerLink: APPLICATION_ROUTE_LINKS.download },
  { labelTranslationKey: 'nav.devices', routerLink: APPLICATION_ROUTE_LINKS.devices },
  { labelTranslationKey: 'nav.account', routerLink: APPLICATION_ROUTE_LINKS.account },
];
