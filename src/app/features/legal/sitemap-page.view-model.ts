import { Injectable, computed, inject } from '@angular/core';
import { AuthenticationSessionStore } from '../../core/auth/authentication-session.store';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';

/**
 * One entry of the sitemap, ready to render.
 */
export interface SitemapEntry {
  /** Translation key of the entry's label. */
  readonly labelTranslationKey: string;
  /** Absolute router link the entry points at. */
  readonly routerLink: string;
}

/**
 * State behind the sitemap.
 *
 * <p>The sitemap lists what the reader can actually reach, so the signed-in pages appear only
 * for a signed-in reader. Working that out is the view-model's job.</p>
 */
@Injectable()
export class SitemapPageViewModel {
  private readonly sessionStore = inject(AuthenticationSessionStore);

  /** Every page the current reader can open, in reading order. */
  readonly sitemapEntries = computed<readonly SitemapEntry[]>(() => [
    ...PUBLIC_SITEMAP_ENTRIES,
    ...(this.sessionStore.isSignedIn() ? SIGNED_IN_SITEMAP_ENTRIES : ANONYMOUS_SITEMAP_ENTRIES),
    ...COMPLIANCE_SITEMAP_ENTRIES,
  ]);
}

/** Pages anyone can open. */
const PUBLIC_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { labelTranslationKey: 'nav.home', routerLink: APPLICATION_ROUTE_LINKS.home },
  { labelTranslationKey: 'nav.download', routerLink: APPLICATION_ROUTE_LINKS.download },
  { labelTranslationKey: 'nav.tips', routerLink: APPLICATION_ROUTE_LINKS.tips },
];

/** Pages that only make sense without a session. */
const ANONYMOUS_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { labelTranslationKey: 'nav.register', routerLink: APPLICATION_ROUTE_LINKS.register },
  { labelTranslationKey: 'nav.login', routerLink: APPLICATION_ROUTE_LINKS.login },
];

/** Pages that only make sense with a session. */
const SIGNED_IN_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { labelTranslationKey: 'nav.devices', routerLink: APPLICATION_ROUTE_LINKS.devices },
  { labelTranslationKey: 'nav.account', routerLink: APPLICATION_ROUTE_LINKS.account },
];

/** The compliance pages, always listed last. */
const COMPLIANCE_SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  { labelTranslationKey: 'footer.gdpr', routerLink: APPLICATION_ROUTE_LINKS.privacy },
  { labelTranslationKey: 'footer.cookies', routerLink: APPLICATION_ROUTE_LINKS.cookies },
];
