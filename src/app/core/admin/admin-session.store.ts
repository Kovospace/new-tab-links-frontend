import { Injectable, computed, signal } from '@angular/core';
import { AdminSession } from '../api/models/admin.model';

/** Key the operator session is remembered under, separate from the user's on purpose. */
const STORED_ADMIN_SESSION_KEY = 'newtablinks.adminSession';

/**
 * The single source of truth for "is an operator signed in right now".
 *
 * <p>Deliberately a second store rather than a mode of {@link
 * import('../auth/authentication-session.store').AuthenticationSessionStore}. The two identities
 * are unrelated: the operator is not a user, their token is a different kind, and either session
 * may exist without the other. Keeping them apart is what makes it impossible for a bug to let a
 * user's token reach an admin call, or the reverse.</p>
 *
 * <p>The token is kept in {@code sessionStorage}, not {@code localStorage} where the user's
 * session lives, so it dies when the tab closes. It is a credential that can delete any account
 * in the system and it lasts half an hour; leaving it on disk for the next person to open the
 * browser is not worth the convenience of surviving a restart.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminSessionStore {
  /** The current operator session, restored from storage so a reload stays signed in. */
  private readonly currentSession = signal<AdminSession | null>(readStoredSession());

  /** Whether an operator session exists and has not expired. */
  readonly isSignedIn = computed<boolean>(() => {
    const session = this.currentSession();
    return session !== null && Date.parse(session.expiresAt) > Date.now();
  });

  /** When the current session expires, or null when there is none. */
  readonly expiresAt = computed<Date | null>(() => {
    const session = this.currentSession();
    return session === null ? null : new Date(session.expiresAt);
  });

  /**
   * Reads the token for the {@code Authorization} header.
   *
   * <p>Returns null once the token has expired rather than sending one the backend will refuse,
   * so an expired session shows the sign-in form instead of a page of failed requests.</p>
   *
   * @returns the current admin token, or null when there is no usable session
   */
  getAccessToken(): string | null {
    return this.isSignedIn() ? this.currentSession()!.accessToken : null;
  }

  /**
   * Starts or replaces the operator session.
   *
   * @param session the session just issued
   */
  startSession(session: AdminSession): void {
    this.currentSession.set(session);
    writeStoredSession(session);
  }

  /**
   * Ends the operator session.
   *
   * <p>Purely local: there is nothing to revoke, because an admin token is stateless and
   * short-lived by design. Signing out forgets it here and waits for it to expire.</p>
   */
  endSession(): void {
    this.currentSession.set(null);
    writeStoredSession(null);
  }
}

/**
 * Reads the remembered operator session.
 *
 * <p>Guarded, because storage genuinely throws in a private window or when the browser is set to
 * block site data, and the admin page must still render.</p>
 *
 * @returns the stored session, or null when there is none or it cannot be read
 */
function readStoredSession(): AdminSession | null {
  try {
    const storedSession = globalThis.sessionStorage?.getItem(STORED_ADMIN_SESSION_KEY);
    return storedSession ? (JSON.parse(storedSession) as AdminSession) : null;
  } catch {
    return null;
  }
}

/**
 * Remembers the operator session, or forgets it.
 *
 * @param session the session to remember, or null to forget it
 */
function writeStoredSession(session: AdminSession | null): void {
  try {
    if (session === null) {
      globalThis.sessionStorage?.removeItem(STORED_ADMIN_SESSION_KEY);
    } else {
      globalThis.sessionStorage?.setItem(STORED_ADMIN_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignored: remembering the session is a convenience, not a requirement.
  }
}
