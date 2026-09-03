import { TestBed } from '@angular/core/testing';
import { AdminSessionStore } from './admin-session.store';

/** A session that has not expired yet. */
const aLiveSession = () => ({
  accessToken: 'an-admin-token',
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
});

/** A session whose token has already run out. */
const anExpiredSession = () => ({
  accessToken: 'a-stale-admin-token',
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
});

describe('AdminSessionStore', () => {
  let adminSessionStore: AdminSessionStore;

  beforeEach(() => {
    globalThis.sessionStorage?.clear();
    TestBed.configureTestingModule({});
    adminSessionStore = TestBed.inject(AdminSessionStore);
  });

  afterEach(() => globalThis.sessionStorage?.clear());

  it('reports nobody signed in until a session is started', () => {
    expect(adminSessionStore.isSignedIn()).toBe(false);
    expect(adminSessionStore.getAccessToken()).toBeNull();
  });

  it('holds the token of a live session', () => {
    adminSessionStore.startSession(aLiveSession());

    expect(adminSessionStore.isSignedIn()).toBe(true);
    expect(adminSessionStore.getAccessToken()).toBe('an-admin-token');
  });

  it('refuses to hand out an expired token, so the page asks for a new session', () => {
    adminSessionStore.startSession(anExpiredSession());

    // Sending it would only earn a 401 per request; there is no refresh for an admin token, so
    // the honest answer is that there is no session.
    expect(adminSessionStore.isSignedIn()).toBe(false);
    expect(adminSessionStore.getAccessToken()).toBeNull();
  });

  it('forgets the session on sign-out', () => {
    adminSessionStore.startSession(aLiveSession());
    adminSessionStore.endSession();

    expect(adminSessionStore.isSignedIn()).toBe(false);
    expect(globalThis.sessionStorage?.getItem('newtablinks.adminSession')).toBeNull();
  });

  it('keeps the operator session in sessionStorage, never in localStorage', () => {
    adminSessionStore.startSession(aLiveSession());

    // A credential that can delete any account must not outlive the tab, and must not sit on
    // disk beside the ordinary user session for the next person to open the browser.
    expect(globalThis.sessionStorage?.getItem('newtablinks.adminSession')).not.toBeNull();
    expect(globalThis.localStorage?.getItem('newtablinks.adminSession')).toBeNull();
  });
});
