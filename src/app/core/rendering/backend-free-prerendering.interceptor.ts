import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { throwError } from 'rxjs';
import { RUNTIME_CONFIGURATION } from '../config/runtime-configuration';

/**
 * Fails every backend call made while a page is being rendered at build time, without sending it.
 *
 * <p>Public pages are rendered to HTML when the image is built, where no backend exists and none
 * should be reached: a build that happened to find something listening on the default backend
 * address would bake its answers into the published pages. What the backend says is per visitor
 * anyway (prices in their currency, their premium standing), so the pages are rendered as they look
 * before it has answered, and the browser asks it once the page is live.</p>
 *
 * <p>Answered as an unreachable server (status 0), the one failure every caller already handles,
 * because a visitor can be offline too. Requests for the site's own files (translations, tips) are
 * left alone: the build serves those from its output.</p>
 *
 * @param request the outgoing request
 * @param next the rest of the chain
 * @returns the response, or an immediate failure for a backend call on the server
 */
export const backendFreePrerenderingInterceptor: HttpInterceptorFn = (request, next) => {
  const isPrerendering = isPlatformServer(inject(PLATFORM_ID));
  const { backendBaseUrl } = inject(RUNTIME_CONFIGURATION);
  const isBackendCall = backendBaseUrl !== '' && request.url.startsWith(backendBaseUrl);
  if (isPrerendering && isBackendCall) {
    return throwError(
      () => new HttpErrorResponse({ status: 0, url: request.url, statusText: 'Prerendering' }),
    );
  }
  return next(request);
};
