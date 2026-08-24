import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { UserAccount, UserProfileUpdateRequest } from '../api/models/user-account.model';
import { AuthenticationSessionStore } from '../auth/authentication-session.store';

/**
 * The signed-in user's own account.
 *
 * <p>Every call here is scoped to the caller by the backend: identity comes from the bearer
 * token and nothing accepts a user id, which is why no method takes one.</p>
 */
@Injectable({ providedIn: 'root' })
export class UserAccountService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly sessionStore = inject(AuthenticationSessionStore);

  /**
   * Fetches the signed-in account.
   *
   * <p>The result is pushed into the session store as well, so that the header can greet the
   * user by their display name without every page fetching the account again.</p>
   *
   * @returns the account
   */
  loadMyAccount(): Observable<UserAccount> {
    return this.backendApiClient
      .get<UserAccount>(API_ENDPOINT_PATHS.user.myAccount)
      .pipe(tap((userAccount) => this.sessionStore.setSignedInAccount(userAccount)));
  }

  /**
   * Changes the display name.
   *
   * <p>The only editable profile field. The email address deliberately cannot be changed: moving
   * an account to a new address has to prove the new one first, and that flow does not exist.</p>
   *
   * @param updateRequest the new display name
   * @returns the updated account
   */
  updateMyProfile(updateRequest: UserProfileUpdateRequest): Observable<UserAccount> {
    return this.backendApiClient
      .put<UserAccount>(API_ENDPOINT_PATHS.user.myAccount, updateRequest)
      .pipe(tap((userAccount) => this.sessionStore.setSignedInAccount(userAccount)));
  }

  /**
   * Deletes the account and everything it owns.
   *
   * <p>Irreversible, and it takes every environment, group, subgroup and link with it. The local
   * session is ended as soon as the backend confirms, because its tokens are now worthless.</p>
   *
   * @returns an observable that completes once the account is gone
   */
  deleteMyAccount(): Observable<void> {
    return this.backendApiClient
      .delete<void>(API_ENDPOINT_PATHS.user.myAccount)
      .pipe(tap(() => this.sessionStore.endSession()));
  }
}
