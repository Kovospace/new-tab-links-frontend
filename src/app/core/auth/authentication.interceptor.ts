import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SKIP_AUTHORIZATION_HEADER } from '../api/backend-api.client';
import { AuthenticationSessionStore } from './authentication-session.store';
import { AuthenticationService } from './authentication.service';

/** Status the backend answers with when the access token is missing, expired or refused. */
const UNAUTHORIZED_STATUS = 401;

/**
 * Attaches the bearer token, and renews it once when the backend says it has expired.
 *
 * <p>Access tokens live about fifteen minutes, so an open page will meet an expired one during
 * any normal visit. Rather than showing the user a failure, the first 401 triggers a refresh and
 * the original request is replayed with the new token. A second failure means the session really
 * is over, and the user is sent to the login page.</p>
 *
 * <p>Requests marked {@link SKIP_AUTHORIZATION_HEADER} are left alone entirely: those are the
 * endpoints that hand out tokens, and refreshing a refresh would recurse.</p>
 */
export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionStore = inject(AuthenticationSessionStore);
  const authenticationService = inject(AuthenticationService);
  const router = inject(Router);

  if (request.context.get(SKIP_AUTHORIZATION_HEADER)) {
    return next(request);
  }

  const accessToken = sessionStore.getAccessToken();
  const authorizedRequest = accessToken ? withBearerToken(request, accessToken) : request;

  return next(authorizedRequest).pipe(
    catchError((failure: unknown) => {
      if (!isExpiredSessionFailure(failure) || !sessionStore.getRefreshToken()) {
        return throwError(() => failure);
      }

      return authenticationService.refreshSession().pipe(
        switchMap((refreshedTokens) => next(withBearerToken(request, refreshedTokens.accessToken))),
        catchError((refreshFailure: unknown) => {
          sessionStore.endSession();
          void router.navigate(['/login']);
          return throwError(() => refreshFailure);
        }),
      );
    }),
  );
};

/**
 * Copies a request, adding the bearer token.
 *
 * @param request     the request to authorize
 * @param accessToken the token to present
 * @returns a copy carrying the {@code Authorization} header
 */
function withBearerToken<TBody>(
  request: HttpRequest<TBody>,
  accessToken: string,
): HttpRequest<TBody> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
}

/**
 * Decides whether a failure means the access token needs renewing.
 *
 * @param failure whatever the request threw
 * @returns true when the backend refused the token rather than the request
 */
function isExpiredSessionFailure(failure: unknown): boolean {
  return failure instanceof HttpErrorResponse && failure.status === UNAUTHORIZED_STATUS;
}
