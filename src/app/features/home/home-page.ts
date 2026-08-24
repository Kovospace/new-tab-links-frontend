import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { HomePageViewModel } from './home-page.view-model';

/**
 * The landing page: what the extension is and why anyone would want it.
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, TranslatePipe],
  providers: [HomePageViewModel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  /** State of the home page. */
  protected readonly viewModel = inject(HomePageViewModel);

  /** Where the call to action leads. */
  protected readonly downloadLink = APPLICATION_ROUTE_LINKS.download;
}
