import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';

/**
 * Shown for any address that matches no route.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  /** Where the way out leads. */
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  protected readonly homeLink = computed(() => this.localizedRouteLinks.links().home);
}
