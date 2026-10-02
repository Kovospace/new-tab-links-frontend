import { Location } from '@angular/common';
import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LocalizedRouteLinks } from '../../../core/routing/localized-route-links';

/**
 * Where "back" goes.
 *
 * <p>The obvious implementation — always {@link Location#back} — is wrong on exactly the pages
 * this button exists for. The compliance texts and the sitemap are reachable from the footer of
 * every page, but they are also the pages someone arrives at from a search engine or a bookmark,
 * with nothing behind them in this tab. There, {@code back()} does nothing at all, and a control
 * that does nothing is worse than no control.</p>
 *
 * <p>So the history is asked first. One entry means this page is where the tab started, and the
 * button goes home instead — the only destination that is certainly useful. Anything more means
 * there is a previous page and the browser's own idea of back is the right one, even when that
 * page belongs to somebody else: leaving the way you came in is what a back button promises.</p>
 */
@Injectable()
export class BackButtonViewModel {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);
  private readonly browserWindow = inject(DOCUMENT).defaultView;

  /**
   * Returns the reader to wherever they were, or to the home page if they were nowhere.
   */
  navigateBack(): void {
    if (this.hasAPreviousPage()) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(this.localizedRouteLinks.links().home);
  }

  /**
   * Whether this tab holds a page to go back to.
   *
   * <p>A session history of one entry is this page and nothing else. The count is the only thing
   * a page is allowed to know about its own history — the entries themselves are deliberately
   * unreadable, so no finer answer is available to anyone.</p>
   *
   * @returns true when the browser has somewhere to go
   */
  private hasAPreviousPage(): boolean {
    return (this.browserWindow?.history.length ?? 0) > 1;
  }
}
