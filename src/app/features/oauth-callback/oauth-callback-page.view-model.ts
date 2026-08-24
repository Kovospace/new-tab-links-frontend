import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { AuthenticationService } from '../../core/auth/authentication.service';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';

/** Query parameter the backend puts the handoff code in when it redirects the browser back. */
const HANDOFF_CODE_PARAMETER = 'code';

/** How far the handoff has got. */
export type HandoffOutcome = 'pending' | 'failed' | 'missing-code';

/**
 * State behind the page the browser lands on after Google.
 *
 * <p>The whole Google flow is a redirect chain: this site sends the browser to the backend, the
 * backend to Google, Google back to the backend, and the backend back here carrying a one-off
 * handoff code. This page trades that code for a real session and moves on.</p>
 *
 * <p>The code lives about two minutes and works exactly once, so it is redeemed the moment the
 * page opens and never retried. On success there is nothing to show: the visitor is sent to
 * their devices page, and this page never appears in their history as a place they were.</p>
 */
@Injectable()
export class OauthCallbackPageViewModel {
  private readonly authenticationService = inject(AuthenticationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly handoffOutcome = signal<HandoffOutcome>('pending');
  private readonly handoffFailureMessage = signal('');

  /** How far the handoff has got. */
  readonly outcome = this.handoffOutcome.asReadonly();

  /** Why the handoff failed, empty while it has not. */
  readonly handoffFailure = this.handoffFailureMessage.asReadonly();

  /**
   * Trades the code in the address bar for a session.
   *
   * <p>Called once when the page opens.</p>
   */
  completeSignInFromRedirect(): void {
    const handoffCode = this.activatedRoute.snapshot.queryParamMap.get(HANDOFF_CODE_PARAMETER);

    if (!handoffCode) {
      this.handoffOutcome.set('missing-code');
      return;
    }

    this.authenticationService.completeGoogleSignIn(handoffCode).subscribe({
      next: () =>
        void this.router.navigate([APPLICATION_ROUTE_LINKS.devices], { replaceUrl: true }),
      error: (failure: unknown) => {
        this.handoffOutcome.set('failed');
        this.handoffFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }
}
