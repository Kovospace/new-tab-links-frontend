import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { AdminSession } from '../api/models/admin.model';
import { AdminSessionStore } from './admin-session.store';

/**
 * The operator's way in.
 *
 * <p>One call, and no refresh: the backend issues a short-lived token and nothing that renews it,
 * so an expired session means signing in again. That is the intended cost of an identity that can
 * delete any account.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthenticationService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly adminSessionStore = inject(AdminSessionStore);

  /**
   * Signs the operator in and remembers the session.
   *
   * <p>The backend answers 401 for every refusal — wrong username, wrong password, or no
   * operator configured at all — and 429 with a {@code Retry-After} header once too many
   * attempts have failed.</p>
   *
   * @param username the operator's name
   * @param password the operator's password
   * @returns the issued session
   */
  signIn(username: string, password: string): Observable<AdminSession> {
    return this.backendApiClient
      .post<AdminSession>(
        API_ENDPOINT_PATHS.admin.signIn,
        { username, password },
        { withoutAuthorization: true },
      )
      .pipe(tap((session) => this.adminSessionStore.startSession(session)));
  }

  /** Ends the operator session on this device. */
  signOut(): void {
    this.adminSessionStore.endSession();
  }
}
