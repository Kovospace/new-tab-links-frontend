import { TestBed } from '@angular/core/testing';
import { TokenPair } from '@app/core/api/models/token-pair.model';
import { AuthenticationSessionStore } from '@app/core/auth/authentication-session.store';

/** Key the session is stored under, as every tab of the site reads it. */
const STORED_SESSION_KEY = 'newtablinks.session';

/** The session this tab signed in with. */
const SESSION_OF_THIS_TAB: TokenPair = {
  accessToken: 'first-access-token',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'first-refresh-token',
  userId: '11111111-1111-1111-1111-111111111111',
  username: 'kovo',
};

/** The pair another tab obtained by refreshing, which revoked this tab's refresh token. */
const SESSION_ROTATED_BY_ANOTHER_TAB: TokenPair = {
  ...SESSION_OF_THIS_TAB,
  accessToken: 'second-access-token',
  refreshToken: 'second-refresh-token',
};

/**
 * Does what another tab does: changes storage, then lets the browser tell this tab about it.
 *
 * @param storedSession the session the other tab stores, or null when it signs out
 */
function storeSessionFromAnotherTab(storedSession: TokenPair | null): void {
  if (storedSession) {
    globalThis.localStorage.setItem(STORED_SESSION_KEY, JSON.stringify(storedSession));
  } else {
    globalThis.localStorage.removeItem(STORED_SESSION_KEY);
  }
  globalThis.dispatchEvent(new StorageEvent('storage', { key: STORED_SESSION_KEY }));
}

describe('AuthenticationSessionStore', () => {
  let sessionStore: AuthenticationSessionStore;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    TestBed.configureTestingModule({});
    sessionStore = TestBed.inject(AuthenticationSessionStore);
  });

  it('starts signed in when another tab already stored a session', () => {
    globalThis.localStorage.setItem(STORED_SESSION_KEY, JSON.stringify(SESSION_OF_THIS_TAB));
    TestBed.resetTestingModule();

    const storeOfANewTab = TestBed.inject(AuthenticationSessionStore);

    expect(storeOfANewTab.isSignedIn()).toBe(true);
    expect(storeOfANewTab.getRefreshToken()).toBe(SESSION_OF_THIS_TAB.refreshToken);
  });

  it('takes over the pair another tab refreshed, instead of keeping the revoked one', () => {
    sessionStore.startSession(SESSION_OF_THIS_TAB);

    storeSessionFromAnotherTab(SESSION_ROTATED_BY_ANOTHER_TAB);

    expect(sessionStore.getRefreshToken()).toBe(SESSION_ROTATED_BY_ANOTHER_TAB.refreshToken);
    expect(sessionStore.getAccessToken()).toBe(SESSION_ROTATED_BY_ANOTHER_TAB.accessToken);
  });

  it('signs out when another tab signs out', () => {
    sessionStore.startSession(SESSION_OF_THIS_TAB);

    storeSessionFromAnotherTab(null);

    expect(sessionStore.isSignedIn()).toBe(false);
  });

  it('signs in when another tab signs in', () => {
    storeSessionFromAnotherTab(SESSION_OF_THIS_TAB);

    expect(sessionStore.isSignedIn()).toBe(true);
    expect(sessionStore.signedInUserLabel()).toBe(SESSION_OF_THIS_TAB.username);
  });

  it('adopts a newer stored pair only when it differs from the refused one', () => {
    sessionStore.startSession(SESSION_OF_THIS_TAB);

    expect(sessionStore.adoptNewerStoredSession(SESSION_OF_THIS_TAB.refreshToken)).toBeNull();

    globalThis.localStorage.setItem(
      STORED_SESSION_KEY,
      JSON.stringify(SESSION_ROTATED_BY_ANOTHER_TAB),
    );

    expect(sessionStore.adoptNewerStoredSession(SESSION_OF_THIS_TAB.refreshToken)).toEqual(
      SESSION_ROTATED_BY_ANOTHER_TAB,
    );
    expect(sessionStore.getRefreshToken()).toBe(SESSION_ROTATED_BY_ANOTHER_TAB.refreshToken);
  });
});
