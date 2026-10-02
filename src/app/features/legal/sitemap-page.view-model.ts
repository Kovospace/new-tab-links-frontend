import { Injectable, computed, inject } from '@angular/core';
import { AuthenticationSessionStore } from '../../core/auth/authentication-session.store';
import {
  ApplicationRouteName,
  LocalizedRouteLinks,
} from '../../core/routing/localized-route-links';

/**
 * One entry of the sitemap, ready to render.
 */
export interface SitemapEntry {
  /** Translation key of the entry's label. */
  readonly labelTranslationKey: string;
  /** Absolute router link the entry points at. */
  readonly routerLink: string;
}

/** A sitemap entry before its link is known, which depends on the reader's language. */
interface UnlinkedSitemapEntry {
  readonly labelTranslationKey: string;
  readonly routeName: ApplicationRouteName;
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
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  /** Every page the current reader can open, in reading order. */
  readonly sitemapEntries = computed<readonly SitemapEntry[]>(() => {
    const links = this.localizedRouteLinks.links();
    const sessionEntries = this.sessionStore.isSignedIn()
      ? SIGNED_IN_SITEMAP_ENTRIES
      : ANONYMOUS_SITEMAP_ENTRIES;
    return [...PUBLIC_SITEMAP_ENTRIES, ...sessionEntries, ...COMPLIANCE_SITEMAP_ENTRIES].map(
      ({ labelTranslationKey, routeName }) => ({
        labelTranslationKey,
        routerLink: links[routeName],
      }),
    );
  });
}

/** Pages anyone can open. */
const PUBLIC_SITEMAP_ENTRIES: readonly UnlinkedSitemapEntry[] = [
  { labelTranslationKey: 'nav.home', routeName: 'home' },
  { labelTranslationKey: 'nav.download', routeName: 'download' },
  { labelTranslationKey: 'nav.tips', routeName: 'tips' },
];

/** Pages that only make sense without a session. */
const ANONYMOUS_SITEMAP_ENTRIES: readonly UnlinkedSitemapEntry[] = [
  { labelTranslationKey: 'nav.register', routeName: 'register' },
  { labelTranslationKey: 'nav.login', routeName: 'login' },
];

/** Pages that only make sense with a session. */
const SIGNED_IN_SITEMAP_ENTRIES: readonly UnlinkedSitemapEntry[] = [
  { labelTranslationKey: 'nav.devices', routeName: 'devices' },
  { labelTranslationKey: 'nav.account', routeName: 'account' },
];

/** The compliance pages, always listed last. */
const COMPLIANCE_SITEMAP_ENTRIES: readonly UnlinkedSitemapEntry[] = [
  { labelTranslationKey: 'footer.privacy', routeName: 'privacy' },
  { labelTranslationKey: 'footer.terms', routeName: 'terms' },
  { labelTranslationKey: 'footer.refunds', routeName: 'refunds' },
  { labelTranslationKey: 'footer.cookies', routeName: 'cookies' },
];
