import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthenticationService } from '../../../core/admin/admin-authentication.service';
import { AdminSessionStore } from '../../../core/admin/admin-session.store';
import { TranslationService } from '../../../core/i18n/translation.service';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';
import { formatInstantForDisplay } from '../../../shared/formatting/instant-formatter';

/** One of the operator's pages, as the header links to it. */
export interface PresentedAdminLink {
  readonly routerLink: string;
  readonly label: string;
  /** Whether it is the page on screen: shown plain, and marked as the current page. */
  readonly isCurrentPage: boolean;
}

/**
 * State behind the header every operator page shares: links between the pages, when the session
 * expires, and signing out.
 *
 * <p>The page on screen is read from the router rather than passed in. The header lives and dies
 * with its page, so the address it was created on is the page it belongs to.</p>
 */
@Injectable()
export class AdminHeaderViewModel {
  private readonly adminAuthenticationService = inject(AdminAuthenticationService);
  private readonly adminSessionStore = inject(AdminSessionStore);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  /** The address the header was rendered on, without its query or fragment. */
  private readonly currentPath = this.router.url.split(/[?#]/)[0];

  /** The operator's pages, in the order the header lists them. */
  readonly presentedLinks = computed<readonly PresentedAdminLink[]>(() => [
    this.presentLink(APPLICATION_ROUTE_LINKS.adminUsers, 'admin.navigation.accounts'),
    this.presentLink(APPLICATION_ROUTE_LINKS.adminMetrics, 'admin.navigation.statistics'),
  ]);

  /** When the operator's session expires, as finished text. */
  readonly sessionExpiryLabel = computed(() => {
    const expiry = this.adminSessionStore.expiresAt();
    return expiry === null
      ? ''
      : formatInstantForDisplay(
          expiry.toISOString(),
          this.translationService.currentLanguageCode(),
        );
  });

  /** Ends the operator's session and returns to the sign-in. */
  signOut(): void {
    this.adminAuthenticationService.signOut();
    void this.router.navigateByUrl(APPLICATION_ROUTE_LINKS.admin);
  }

  /**
   * Words one link and marks whether it is the page on screen.
   *
   * @param routerLink     where it leads
   * @param translationKey what it says
   * @returns the link, ready to render
   */
  private presentLink(routerLink: string, translationKey: string): PresentedAdminLink {
    return {
      routerLink,
      label: this.translationService.translate(translationKey),
      isCurrentPage: this.currentPath === routerLink,
    };
  }
}
