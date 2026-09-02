import { HttpClient, HttpContext, HttpContextToken, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RUNTIME_CONFIGURATION } from '../config/runtime-configuration';

/**
 * Marks a request that must not carry an {@code Authorization} header.
 *
 * <p>Set on the calls that obtain tokens in the first place — logging in, refreshing, redeeming
 * a code — because sending an expired access token to them invites the interceptor to try to
 * refresh a request that is already the refresh.</p>
 */
export const SKIP_AUTHORIZATION_HEADER = new HttpContextToken<boolean>(() => false);

/** Header the backend reads to label the device row a session belongs to. */
const DEVICE_NAME_HEADER = 'X-Device-Name';

/**
 * Header carrying the shared key that admits this website to the backend's public
 * username-existence endpoint.
 *
 * <p>Must match the backend's expected header name exactly, and the backend's CORS
 * configuration has to list it: {@code ALLOWED_CORS_REQUEST_HEADERS} there is an explicit list
 * rather than a wildcard, so a header missing from it fails the browser's preflight and the
 * request never leaves the browser at all.</p>
 */
const FRONTEND_API_KEY_HEADER = 'X-Frontend-Api-Key';

/**
 * Header carrying the metered pass the backend issues to an anonymous visitor.
 *
 * <p>Demanded on registration and on the username-existence lookup, the two endpoints that
 * disclose whether an account exists. Same CORS trap as the header above: the backend lists
 * allowed request headers explicitly, so one missing from that list fails the preflight and the
 * request never leaves the browser.</p>
 */
const VISITOR_TOKEN_HEADER = 'X-Visitor-Token';

/**
 * The one place that knows where the backend lives and how to address it.
 *
 * <p>Feature services call this rather than {@link HttpClient} directly, so that the base URL,
 * the device-name header and the "this request is unauthenticated" marker are applied
 * identically everywhere instead of being repeated per call.</p>
 */
@Injectable({ providedIn: 'root' })
export class BackendApiClient {
  private readonly httpClient = inject(HttpClient);
  private readonly runtimeConfiguration = inject(RUNTIME_CONFIGURATION);

  /**
   * Sends a GET request.
   *
   * @param path            backend path, starting with a slash
   * @param queryParameters optional query string values
   * @param options         whether to omit the bearer token and which extra headers to send
   * @returns the parsed response body
   */
  get<TResponse>(
    path: string,
    queryParameters?: Readonly<Record<string, string>>,
    options: BackendRequestOptions = {},
  ): Observable<TResponse> {
    return this.httpClient.get<TResponse>(this.buildAbsoluteUrl(path), {
      params: queryParameters,
      headers: this.buildHeaders(options),
      context: this.buildContext(options),
    });
  }

  /**
   * Sends a POST request.
   *
   * @param path        backend path, starting with a slash
   * @param requestBody body to send, or null for endpoints that take none
   * @param options     whether to omit the bearer token and whether to name this device
   * @returns the parsed response body
   */
  post<TResponse>(
    path: string,
    requestBody: unknown,
    options: BackendRequestOptions = {},
  ): Observable<TResponse> {
    return this.httpClient.post<TResponse>(this.buildAbsoluteUrl(path), requestBody, {
      headers: this.buildHeaders(options),
      context: this.buildContext(options),
    });
  }

  /**
   * Sends a PUT request.
   *
   * @param path        backend path, starting with a slash
   * @param requestBody body to send
   * @returns the parsed response body
   */
  put<TResponse>(path: string, requestBody: unknown): Observable<TResponse> {
    return this.httpClient.put<TResponse>(this.buildAbsoluteUrl(path), requestBody);
  }

  /**
   * Sends a DELETE request.
   *
   * @param path backend path, starting with a slash
   * @returns the parsed response body, which these endpoints leave empty
   */
  delete<TResponse>(path: string): Observable<TResponse> {
    return this.httpClient.delete<TResponse>(this.buildAbsoluteUrl(path));
  }

  /**
   * Turns a backend path into the absolute URL to call.
   *
   * @param path backend path, starting with a slash
   * @returns the absolute URL
   */
  buildAbsoluteUrl(path: string): string {
    return `${this.runtimeConfiguration.backendBaseUrl}${path}`;
  }

  /**
   * Builds the headers a request needs beyond the defaults.
   *
   * <p>Returns undefined rather than an empty {@link HttpHeaders} when nothing was asked for,
   * so that a request which wants no extra headers is indistinguishable from one sent before
   * this method existed.</p>
   *
   * @param options what the caller asked for
   * @returns the headers, or undefined when none are needed
   */
  private buildHeaders(options: BackendRequestOptions): HttpHeaders | undefined {
    const headerValuesByName: Record<string, string> = {};

    if (options.identifyThisDevice) {
      headerValuesByName[DEVICE_NAME_HEADER] = this.runtimeConfiguration.webClientDeviceName;
    }
    if (options.withFrontendApiKey && this.runtimeConfiguration.frontendApiKey) {
      headerValuesByName[FRONTEND_API_KEY_HEADER] = this.runtimeConfiguration.frontendApiKey;
    }
    if (options.visitorToken) {
      headerValuesByName[VISITOR_TOKEN_HEADER] = options.visitorToken;
    }

    return Object.keys(headerValuesByName).length > 0
      ? new HttpHeaders(headerValuesByName)
      : undefined;
  }

  /**
   * Builds the context that tells the interceptor whether to attach a bearer token.
   *
   * @param options what the caller asked for
   * @returns the context, or undefined when the defaults apply
   */
  private buildContext(options: BackendRequestOptions): HttpContext | undefined {
    return options.withoutAuthorization
      ? new HttpContext().set(SKIP_AUTHORIZATION_HEADER, true)
      : undefined;
  }
}

/**
 * Per-request choices a caller can make.
 */
export interface BackendRequestOptions {
  /**
   * Omits the {@code Authorization} header.
   *
   * <p>For the endpoints that hand out tokens: they are public, and letting the interceptor try
   * to refresh them would recurse.</p>
   */
  readonly withoutAuthorization?: boolean;

  /**
   * Sends this website's device name.
   *
   * <p>Only meaningful on endpoints that issue tokens, since that is when the backend records
   * which device a session belongs to.</p>
   */
  readonly identifyThisDevice?: boolean;

  /**
   * Sends the shared frontend API key.
   *
   * <p>Only the username-existence endpoint asks for it. The header is omitted entirely when no
   * key is configured, rather than sent empty: the backend denies that endpoint by default, and
   * an absent header describes the situation more honestly than a blank one.</p>
   */
  readonly withFrontendApiKey?: boolean;

  /**
   * Sends a metered pass obtained from {@code VisitorTokenService}.
   *
   * <p>Unlike the options above this carries a value rather than a flag, because the pass is
   * obtained at runtime rather than configured. Omitted entirely when undefined or empty: a
   * deployment whose backend does not meter these endpoints, or one where the pass could not be
   * obtained, is better served by an absent header than by a blank one that is guaranteed to be
   * refused.</p>
   */
  readonly visitorToken?: string;
}
