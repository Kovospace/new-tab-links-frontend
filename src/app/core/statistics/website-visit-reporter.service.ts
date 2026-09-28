import { Injectable, OnDestroy, inject } from '@angular/core';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { APPLICATION_ROUTE_PATHS } from '../routing/application-route-paths';

/** How long the page must have been visible — time spent hidden does not count. */
export const REQUIRED_VISIBLE_MILLISECONDS = 3_000;

/** What counts as a person doing something on the page. */
const INTERACTION_EVENT_TYPES = ['pointermove', 'scroll', 'keydown', 'touchstart'] as const;

/**
 * Tells the backend, once per page load, that a person visited the website.
 *
 * <p>Robots are not people, and the count is only worth having if it leaves them out. So the
 * visit is reported only when the visitor behaves like one: the page has been <em>visible</em> for
 * three seconds (a tab opened in the background and never looked at does not count), and at least
 * one pointer move, scroll, key press or touch has happened. A browser that declares itself
 * automated ({@code navigator.webdriver}) is never counted, and the backend drops crawlers by
 * their user agent on top of this.</p>
 *
 * <p>Never from the operator's pages: the owner checking the numbers is not a visitor. The ad slot
 * the extension frames is a static file outside this application, so it never gets here.</p>
 *
 * <p>Sent with {@code fetch} rather than through {@code BackendApiClient}'s {@code HttpClient}
 * calls, for two things {@code HttpClient} cannot do: {@code keepalive}, so a visit reported as
 * the tab closes still arrives, and {@code credentials: 'omit'} with {@code no-cors}, so the
 * request carries no cookie and needs no preflight. The address still comes from the client, so
 * the backend's base URL stays in one place. No cookie and no storage here either: the backend
 * dedupes per visitor per day. Failures are ignored — a lost visit is not the visitor's problem.</p>
 */
@Injectable({ providedIn: 'root' })
export class WebsiteVisitReporter implements OnDestroy {
  private readonly backendApiClient = inject(BackendApiClient);

  /** Visible time gathered before the latest time the page was hidden. */
  private visibleMillisecondsBeforeNow = 0;
  /** When the page last became visible, or null while it is hidden. */
  private visibleSince: number | null = null;
  /** Fires once the page has been visible long enough. */
  private visibilityTimerHandle: ReturnType<typeof setTimeout> | null = null;
  private hasBeenVisibleLongEnough = false;
  private hasSeenInteraction = false;
  private isFinished = false;

  private readonly handleVisibilityChange = (): void => this.followVisibility();
  private readonly handleInteraction = (): void => {
    this.hasSeenInteraction = true;
    this.reportWhenBothSignsAreThere();
  };

  /**
   * Starts watching for the signs of a person, once, when the application starts.
   */
  watchForHumanVisit(): void {
    if (typeof document === 'undefined' || this.isAutomatedBrowser()) {
      return;
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    for (const eventType of INTERACTION_EVENT_TYPES) {
      globalThis.addEventListener(eventType, this.handleInteraction, { passive: true });
    }
    this.followVisibility();
  }

  /**
   * Stops listening when the application is torn down, before any visit was reported.
   */
  ngOnDestroy(): void {
    if (!this.isFinished && typeof document !== 'undefined') {
      this.stopWatching();
    }
  }

  /**
   * Counts visible time: starts the clock when the page shows, banks it when the page hides.
   */
  private followVisibility(): void {
    if (document.visibilityState === 'visible') {
      this.visibleSince ??= Date.now();
      this.scheduleVisibilityRequirement();
    } else {
      if (this.visibleSince !== null) {
        this.visibleMillisecondsBeforeNow += Date.now() - this.visibleSince;
        this.visibleSince = null;
      }
      this.cancelVisibilityTimer();
    }
  }

  /**
   * Waits for whatever visible time is still missing.
   */
  private scheduleVisibilityRequirement(): void {
    this.cancelVisibilityTimer();
    const missingMilliseconds = REQUIRED_VISIBLE_MILLISECONDS - this.visibleMillisecondsBeforeNow;
    this.visibilityTimerHandle = setTimeout(
      () => {
        this.hasBeenVisibleLongEnough = true;
        this.reportWhenBothSignsAreThere();
      },
      Math.max(missingMilliseconds, 0),
    );
  }

  /**
   * Sends the visit once both signs have been seen, and stops listening.
   */
  private reportWhenBothSignsAreThere(): void {
    if (this.isFinished || !this.hasBeenVisibleLongEnough || !this.hasSeenInteraction) {
      return;
    }
    this.stopWatching();
    if (!this.isOnOperatorPage()) {
      this.sendVisit();
    }
  }

  /**
   * Posts the empty visit report, ignoring whatever comes back.
   */
  private sendVisit(): void {
    const visitUrl = this.backendApiClient.buildAbsoluteUrl(
      API_ENDPOINT_PATHS.statistics.websiteVisit,
    );
    try {
      void globalThis
        .fetch(visitUrl, { method: 'POST', keepalive: true, credentials: 'omit', mode: 'no-cors' })
        .catch(() => undefined);
    } catch {
      // Ignored: see the class comment.
    }
  }

  /**
   * Removes every listener and timer; the visit is reported at most once.
   */
  private stopWatching(): void {
    this.isFinished = true;
    this.cancelVisibilityTimer();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    for (const eventType of INTERACTION_EVENT_TYPES) {
      globalThis.removeEventListener(eventType, this.handleInteraction);
    }
  }

  private cancelVisibilityTimer(): void {
    if (this.visibilityTimerHandle !== null) {
      clearTimeout(this.visibilityTimerHandle);
      this.visibilityTimerHandle = null;
    }
  }

  /**
   * Whether the browser says it is driven by automation — headless test runners and scrapers
   * built on them set this.
   *
   * @returns true for an automated browser
   */
  private isAutomatedBrowser(): boolean {
    return globalThis.navigator?.webdriver === true;
  }

  /**
   * Whether the operator's pages are on screen now, which are never counted.
   *
   * @returns true below {@code /admin}
   */
  private isOnOperatorPage(): boolean {
    const firstPathSegment = globalThis.location.pathname.split('/')[1] ?? '';
    return firstPathSegment === APPLICATION_ROUTE_PATHS.admin;
  }
}
