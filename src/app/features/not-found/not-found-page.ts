import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';

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
  protected readonly homeLink = APPLICATION_ROUTE_LINKS.home;
}
