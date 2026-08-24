import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { OauthCallbackPageViewModel } from './oauth-callback-page.view-model';

/**
 * Where the browser lands after Google has vouched for the user.
 *
 * <p>A waiting room, not a destination: it exists to redeem the handoff code and move on.</p>
 */
@Component({
  selector: 'app-oauth-callback-page',
  imports: [RouterLink, TranslatePipe],
  providers: [OauthCallbackPageViewModel],
  templateUrl: './oauth-callback-page.html',
  styleUrl: './oauth-callback-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OauthCallbackPage implements OnInit {
  /** State of the handoff. */
  protected readonly viewModel = inject(OauthCallbackPageViewModel);

  /** Where a failed handoff sends the visitor. */
  protected readonly loginLink = APPLICATION_ROUTE_LINKS.login;

  /**
   * Redeems the handoff code as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.completeSignInFromRedirect();
  }
}
