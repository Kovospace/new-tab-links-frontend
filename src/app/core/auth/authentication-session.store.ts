import { Injectable, computed, inject, signal } from '@angular/core';
import { TokenPair } from '../api/models/token-pair.model';
import { UserAccount } from '../api/models/user-account.model';
import { SessionStorageService } from './session-storage.service';

/**
 * The single source of truth for "who is signed in right now".
 *
 * <p>Everything that has to know — the header's navigation, the route guards, the HTTP
 * interceptor, the account page — reads this store, so there is exactly one place where a
 * session begins and ends.</p>
 *
 * <p>State is exposed as signals: a sign-in or sign-out re-renders every dependent view with no
 * subscriptions and no manual change detection.</p>
 */
@Injectable({ providedIn: 'root' })
export class AuthenticationSessionStore {
  private readonly sessionStorageService = inject(SessionStorageService);

  /** Tokens of the current session, restored from storage so a reload stays signed in. */
  private readonly currentTokenPair = signal<TokenPair | null>(
    this.sessionStorageService.readStoredSession(),
  );

  /** The signed-in account, loaded lazily; null until something asks for it. */
  private readonly currentUserAccount = signal<UserAccount | null>(null);

  /**
   * Follows the session other tabs store, so that this tab never presents a refresh token another
   * tab has already rotated away, and signs out when another tab does.
   */
  constructor() {
    this.sessionStorageService.watchStoredSessionFromOtherTabs((storedSession) =>
      this.followSessionStoredElsewhere(storedSession),
    );
  }

  /** The signed-in account, or null when it has not been loaded yet. */
  readonly signedInAccount = this.currentUserAccount.asReadonly();

  /** Whether a session exists at all. */
  readonly isSignedIn = computed<boolean>(() => this.currentTokenPair() !== null);

  /**
   * Name to greet the user by.
   *
   * <p>Prefers the display name, falls back to the username carried in the token pair, so that
   * the header can address the user before the account has been fetched.</p>
   */
  readonly signedInUserLabel = computed<string>(
    () => this.currentUserAccount()?.displayName ?? this.currentTokenPair()?.username ?? '',
  );

  /**
   * Reads the access token for the {@code Authorization} header.
   *
   * @returns the current access token, or null when nobody is signed in
   */
  getAccessToken(): string | null {
    return this.currentTokenPair()?.accessToken ?? null;
  }

  /**
   * Reads the refresh token used to obtain the next token pair.
   *
   * @returns the current refresh token, or null when nobody is signed in
   */
  getRefreshToken(): string | null {
    return this.currentTokenPair()?.refreshToken ?? null;
  }

  /**
   * Starts or replaces the session.
   *
   * <p>Called by every sign-in path and by every token refresh, since the backend rotates the
   * refresh token on each use and the old one stops working immediately.</p>
   *
   * @param tokenPair the tokens just issued
   */
  startSession(tokenPair: TokenPair): void {
    this.currentTokenPair.set(tokenPair);
    this.sessionStorageService.writeSession(tokenPair);
  }

  /**
   * Adopts a newer session another tab has stored, when there is one.
   *
   * <p>The fallback for the race the {@code storage} event cannot close: two tabs refreshing at
   * the same moment with the same token. One wins; the loser's refusal does not mean the session
   * is over, only that the winner's pair is already in storage.</p>
   *
   * @param refusedRefreshToken the refresh token the backend has just refused
   * @returns the stored session, when it carries a different refresh token; otherwise null
   */
  adoptNewerStoredSession(refusedRefreshToken: string): TokenPair | null {
    const storedSession = this.sessionStorageService.readStoredSession();
    if (!storedSession || storedSession.refreshToken === refusedRefreshToken) {
      return null;
    }
    this.currentTokenPair.set(storedSession);
    return storedSession;
  }

  /**
   * Records the account behind the current session.
   *
   * @param userAccount the account as the backend reports it
   */
  setSignedInAccount(userAccount: UserAccount): void {
    this.currentUserAccount.set(userAccount);
  }

  /**
   * Ends the session locally.
   *
   * <p>Only the local half: revoking the refresh token on the backend is
   * {@code AuthenticationService}'s job, and this must still happen even when that call fails.</p>
   */
  endSession(): void {
    this.currentTokenPair.set(null);
    this.currentUserAccount.set(null);
    this.sessionStorageService.clearSession();
  }

  /**
   * Mirrors in memory what another tab has just stored — without writing it back, which would
   * only echo the event to every other tab.
   *
   * <p>The loaded account is dropped when the session ends or belongs to someone else, so the
   * header never greets the previous user.</p>
   *
   * @param storedSession the session now in storage, or null when another tab signed out
   */
  private followSessionStoredElsewhere(storedSession: TokenPair | null): void {
    if (storedSession?.username !== this.currentTokenPair()?.username) {
      this.currentUserAccount.set(null);
    }
    this.currentTokenPair.set(storedSession);
  }
}
