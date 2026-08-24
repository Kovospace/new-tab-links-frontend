import { Injectable } from '@angular/core';
import { TokenPair } from '../api/models/token-pair.model';

/** Key the token pair is stored under. */
const STORED_SESSION_KEY = 'newtablinks.session';

/**
 * Keeps the signed-in session across page reloads.
 *
 * <p>Isolated behind its own service so that the storage medium is one decision in one file.
 * Today it is {@code localStorage}, which is the pragmatic choice for a portal: the alternative,
 * an http-only refresh cookie, needs the backend to set cookies for this origin and it does not.
 * Should that change, only this class changes.</p>
 *
 * <p>Every access is guarded, because storage genuinely throws in a private window or when the
 * browser is set to block site data, and a page that cannot remember a session must still
 * render.</p>
 */
@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  /**
   * Reads the stored session.
   *
   * @returns the stored token pair, or null when there is none or it cannot be read
   */
  readStoredSession(): TokenPair | null {
    try {
      const storedSession = globalThis.localStorage?.getItem(STORED_SESSION_KEY);
      return storedSession ? (JSON.parse(storedSession) as TokenPair) : null;
    } catch {
      return null;
    }
  }

  /**
   * Writes the session so that a reload stays signed in.
   *
   * @param tokenPair the tokens to remember
   */
  writeSession(tokenPair: TokenPair): void {
    try {
      globalThis.localStorage?.setItem(STORED_SESSION_KEY, JSON.stringify(tokenPair));
    } catch {
      // Ignored: the session still works for this page load, it just will not survive a reload.
    }
  }

  /**
   * Forgets the session, on sign-out or when the backend refuses the tokens.
   */
  clearSession(): void {
    try {
      globalThis.localStorage?.removeItem(STORED_SESSION_KEY);
    } catch {
      // Ignored: nothing useful can be done, and the in-memory session is cleared regardless.
    }
  }
}
