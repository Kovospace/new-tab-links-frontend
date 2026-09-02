import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import {
  LoginRequest,
  SingleUseCodeRedemptionRequest,
} from '../api/models/authentication-request.model';
import { RegistrationAccepted, RegistrationRequest } from '../api/models/registration.model';
import { TokenPair } from '../api/models/token-pair.model';
import { AuthenticationSessionStore } from './authentication-session.store';
import { VisitorTokenService } from './visitor-token.service';

/**
 * Every way into and out of a session.
 *
 * <p>Three paths lead in — a password, Google, and the activation of a freshly registered
 * account — and all of them end in the same {@link TokenPair}, which is handed straight to
 * {@link AuthenticationSessionStore}. Nothing downstream can tell which path was taken.</p>
 *
 * <p>The Google path is a browser redirect, not a request: see {@link startGoogleSignIn}.</p>
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly sessionStore = inject(AuthenticationSessionStore);
  private readonly visitorTokenService = inject(VisitorTokenService);

  /**
   * Registers an account and asks the backend to mail an activation link.
   *
   * <p>The answer is deliberately identical whether the account was created or the address was
   * already taken, so its wording comes from the backend and must be shown as received rather
   * than replaced with a message of our own.</p>
   *
   * <p>Carries a metered pass, because the one thing this endpoint does answer openly is a taken
   * username, with a 409 — the same disclosure the username lookup makes, and metered the same
   * way. See {@link VisitorTokenService}.</p>
   *
   * @param registrationRequest the account to create
   * @returns the backend's uniform acknowledgement
   */
  register(registrationRequest: RegistrationRequest): Observable<RegistrationAccepted> {
    return this.visitorTokenService.runWithVisitorToken((visitorToken) =>
      this.backendApiClient.post<RegistrationAccepted>(
        API_ENDPOINT_PATHS.auth.register,
        registrationRequest,
        { withoutAuthorization: true, visitorToken },
      ),
    );
  }

  /**
   * Activates an account from the token carried by an activation link.
   *
   * @param activationToken token taken from the link's query string
   * @returns an observable that completes once the account is active
   */
  activateAccount(activationToken: string): Observable<void> {
    return this.backendApiClient.get<void>(API_ENDPOINT_PATHS.auth.activate, {
      token: activationToken,
    });
  }

  /**
   * Asks for a fresh activation link.
   *
   * @param emailAddress address the original link was sent to
   * @returns the backend's uniform acknowledgement
   */
  resendActivationLink(emailAddress: string): Observable<RegistrationAccepted> {
    return this.backendApiClient.post<RegistrationAccepted>(
      `${API_ENDPOINT_PATHS.auth.resendActivation}?email=${encodeURIComponent(emailAddress)}`,
      null,
      { withoutAuthorization: true },
    );
  }

  /**
   * Signs in with a username or email address and a password.
   *
   * @param loginRequest the credentials to present
   * @returns the issued tokens, already stored in the session
   */
  signInWithPassword(loginRequest: LoginRequest): Observable<TokenPair> {
    return this.backendApiClient
      .post<TokenPair>(API_ENDPOINT_PATHS.auth.login, loginRequest, {
        withoutAuthorization: true,
        identifyThisDevice: true,
      })
      .pipe(tap((tokenPair) => this.sessionStore.startSession(tokenPair)));
  }

  /**
   * Sends the browser to Google.
   *
   * <p>A full page navigation on purpose. The flow is a redirect chain — this site to the
   * backend, the backend to Google, Google back to the backend, the backend back to this site's
   * OAuth callback route with a handoff code — and no {@code fetch} can follow it. The backend
   * decides where the browser lands; it is configured with this site's base URL.</p>
   */
  startGoogleSignIn(): void {
    globalThis.location.href = this.backendApiClient.buildAbsoluteUrl(
      API_ENDPOINT_PATHS.providerSignIn.google,
    );
  }

  /**
   * Trades the handoff code the OAuth callback route received for a real session.
   *
   * <p>The code lives about two minutes and works once, so this runs the moment the callback
   * page opens.</p>
   *
   * @param handoffCode value of the {@code code} query parameter
   * @returns the issued tokens, already stored in the session
   */
  completeGoogleSignIn(handoffCode: string): Observable<TokenPair> {
    const redemptionRequest: SingleUseCodeRedemptionRequest = { code: handoffCode };

    return this.backendApiClient
      .post<TokenPair>(API_ENDPOINT_PATHS.auth.sessionHandoff, redemptionRequest, {
        withoutAuthorization: true,
        identifyThisDevice: true,
      })
      .pipe(tap((tokenPair) => this.sessionStore.startSession(tokenPair)));
  }

  /**
   * Trades the current refresh token for a fresh pair.
   *
   * <p>The presented token is revoked in the process, so the new pair must replace the old one
   * immediately — which is why the store is updated here and not by the caller.</p>
   *
   * @returns the new tokens
   */
  refreshSession(): Observable<TokenPair> {
    const refreshToken = this.sessionStore.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Cannot refresh a session that does not exist');
    }

    return this.backendApiClient
      .post<TokenPair>(
        API_ENDPOINT_PATHS.auth.refresh,
        { refreshToken },
        { withoutAuthorization: true },
      )
      .pipe(tap((tokenPair) => this.sessionStore.startSession(tokenPair)));
  }

  /**
   * Ends the session here and on the backend.
   *
   * <p>The local session is cleared whatever the backend answers: a refresh token the backend
   * already considers dead would otherwise leave the user apparently signed in with credentials
   * that cannot work.</p>
   *
   * @returns an observable that completes once the sign-out attempt has finished
   */
  signOut(): Observable<void> {
    const refreshToken = this.sessionStore.getRefreshToken();
    if (!refreshToken) {
      this.sessionStore.endSession();
      return of(undefined);
    }

    return this.backendApiClient
      .post<void>(API_ENDPOINT_PATHS.auth.logout, { refreshToken }, { withoutAuthorization: true })
      .pipe(
        catchError(() => of(undefined)),
        switchMap(() => {
          this.sessionStore.endSession();
          return of(undefined);
        }),
      );
  }
}
