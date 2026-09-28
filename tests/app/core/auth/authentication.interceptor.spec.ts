import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TokenPair } from '@app/core/api/models/token-pair.model';
import { AuthenticationSessionStore } from '@app/core/auth/authentication-session.store';
import { authenticationInterceptor } from '@app/core/auth/authentication.interceptor';

/** The session the browser starts with. */
const EXPIRED_SESSION: TokenPair = {
  accessToken: 'expired-access-token',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'valid-refresh-token',
  userId: '11111111-1111-1111-1111-111111111111',
  username: 'kovo',
};

/** What the backend answers a refresh with. */
const REFRESHED_SESSION: TokenPair = {
  accessToken: 'fresh-access-token',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'rotated-refresh-token',
  userId: EXPIRED_SESSION.userId,
  username: EXPIRED_SESSION.username,
};

describe('authenticationInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let sessionStore: AuthenticationSessionStore;

  beforeEach(() => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authenticationInterceptor])),
        provideHttpClientTesting(),
        // A stub login route: a refused refresh navigates there, and a router with no
        // routes at all would reject that navigation and fail the run.
        provideRouter([{ path: 'login', children: [] }]),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    sessionStore = TestBed.inject(AuthenticationSessionStore);
  });

  afterEach(() => httpTestingController.verify());

  it('attaches the access token to an ordinary request', () => {
    sessionStore.startSession(EXPIRED_SESSION);

    httpClient.get('/api/v1/users/me').subscribe();

    const sentRequest = httpTestingController.expectOne('/api/v1/users/me');
    expect(sentRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${EXPIRED_SESSION.accessToken}`,
    );
    sentRequest.flush({});
  });

  it('sends nothing when nobody is signed in', () => {
    httpClient.get('/api/v1/users/me').subscribe();

    const sentRequest = httpTestingController.expectOne('/api/v1/users/me');
    expect(sentRequest.request.headers.has('Authorization')).toBe(false);
    sentRequest.flush({});
  });

  it('refreshes once on a 401 and replays the request with the new token', () => {
    sessionStore.startSession(EXPIRED_SESSION);

    let receivedBody: unknown = null;
    httpClient.get('/api/v1/users/me').subscribe((body) => (receivedBody = body));

    httpTestingController
      .expectOne('/api/v1/users/me')
      .flush('', { status: 401, statusText: 'Unauthorized' });

    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/refresh'))
      .flush(REFRESHED_SESSION);

    const replayedRequest = httpTestingController.expectOne('/api/v1/users/me');
    expect(replayedRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${REFRESHED_SESSION.accessToken}`,
    );
    replayedRequest.flush({ username: 'kovo' });

    expect(receivedBody).toEqual({ username: 'kovo' });
    expect(sessionStore.getAccessToken()).toBe(REFRESHED_SESSION.accessToken);
  });

  it('ends the session when the refresh itself is refused', () => {
    sessionStore.startSession(EXPIRED_SESSION);

    httpClient.get('/api/v1/users/me').subscribe({ error: () => undefined });

    httpTestingController
      .expectOne('/api/v1/users/me')
      .flush('', { status: 401, statusText: 'Unauthorized' });

    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/refresh'))
      .flush('', { status: 401, statusText: 'Unauthorized' });

    expect(sessionStore.isSignedIn()).toBe(false);
  });

  it('replays with the pair another tab stored when that tab used the refresh token first', () => {
    sessionStore.startSession(EXPIRED_SESSION);
    // Another tab refreshed a moment earlier: its rotated pair is in storage, this tab has not
    // heard yet, and the backend has already revoked the token this tab is about to present.
    globalThis.localStorage.setItem('newtablinks.session', JSON.stringify(REFRESHED_SESSION));

    let receivedBody: unknown = null;
    httpClient.get('/api/v1/users/me').subscribe((body) => (receivedBody = body));

    httpTestingController
      .expectOne('/api/v1/users/me')
      .flush('', { status: 401, statusText: 'Unauthorized' });

    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/refresh'))
      .flush('', { status: 401, statusText: 'Unauthorized' });

    const replayedRequest = httpTestingController.expectOne('/api/v1/users/me');
    expect(replayedRequest.request.headers.get('Authorization')).toBe(
      `Bearer ${REFRESHED_SESSION.accessToken}`,
    );
    replayedRequest.flush({ username: 'kovo' });

    expect(receivedBody).toEqual({ username: 'kovo' });
    expect(sessionStore.isSignedIn()).toBe(true);
    expect(globalThis.localStorage.getItem('newtablinks.session')).toBe(
      JSON.stringify(REFRESHED_SESSION),
    );
  });

  it('does not try to refresh when there is no session to refresh', () => {
    httpClient.get('/api/v1/users/me').subscribe({ error: () => undefined });

    httpTestingController
      .expectOne('/api/v1/users/me')
      .flush('', { status: 401, statusText: 'Unauthorized' });

    httpTestingController.verify();
  });
});
