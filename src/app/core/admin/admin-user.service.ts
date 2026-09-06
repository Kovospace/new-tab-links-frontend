import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient, BackendRequestOptions } from '../api/backend-api.client';
import {
  AdminUser,
  AdminUserCreation,
  AdminUserPage,
  AdminUserUpdate,
} from '../api/models/admin.model';
import { AdminSessionStore } from './admin-session.store';

/**
 * Reading and repairing accounts, for the operator.
 *
 * <p>Every call here carries the operator's token explicitly rather than letting the interceptor
 * attach the signed-in user's. The two identities are unrelated and must never be substituted for
 * one another — a bug that sent a user's token here would simply be refused, which is the point.
 * </p>
 *
 * <p>Nothing here is ownership-scoped: the operator names an account by identifier and gets it.
 * That is the whole purpose, and the reason the backend keeps it behind its own authority.</p>
 */
@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly adminSessionStore = inject(AdminSessionStore);

  /**
   * Lists accounts, newest first.
   *
   * @param searchText text matched against username, email and display name; empty lists all
   * @param page       zero-based page index
   * @param size       how many accounts to return
   * @returns the requested page
   */
  listAccounts(searchText: string, page: number, size: number): Observable<AdminUserPage> {
    return this.backendApiClient.get<AdminUserPage>(
      API_ENDPOINT_PATHS.admin.users,
      { query: searchText, page: String(page), size: String(size) },
      this.asTheOperator(),
    );
  }

  /**
   * Creates an account without going through registration.
   *
   * @param newAccount the account to create
   * @returns the created account
   */
  createAccount(newAccount: AdminUserCreation): Observable<AdminUser> {
    return this.backendApiClient.post<AdminUser>(
      API_ENDPOINT_PATHS.admin.users,
      newAccount,
      this.asTheOperator(),
    );
  }

  /**
   * Replaces the fields an operator may change.
   *
   * @param userId  identifier of the account
   * @param changes the new values, all of them
   * @returns the updated account
   */
  updateAccount(userId: string, changes: AdminUserUpdate): Observable<AdminUser> {
    return this.backendApiClient.put<AdminUser>(
      API_ENDPOINT_PATHS.admin.user(userId),
      changes,
      this.asTheOperator(),
    );
  }

  /**
   * Clears an account's failed sign-in counter.
   *
   * @param userId identifier of the account
   * @returns the unlocked account
   */
  unlockAccount(userId: string): Observable<AdminUser> {
    return this.backendApiClient.post<AdminUser>(
      API_ENDPOINT_PATHS.admin.unlockUser(userId),
      null,
      this.asTheOperator(),
    );
  }

  /**
   * Sets or removes an account's password.
   *
   * @param userId      identifier of the account
   * @param newPassword the password to set, or an empty string to remove it
   * @returns the account
   */
  setPassword(userId: string, newPassword: string): Observable<AdminUser> {
    return this.backendApiClient.put<AdminUser>(
      API_ENDPOINT_PATHS.admin.userPassword(userId),
      { password: newPassword.length > 0 ? newPassword : null },
      this.asTheOperator(),
    );
  }

  /**
   * Deletes an account and everything it owns.
   *
   * <p>Irreversible, and wider than it looks: every environment, group, subgroup and link the
   * account owns goes with it. Whatever calls this must have asked first.</p>
   *
   * @param userId identifier of the account
   * @returns an observable that completes once the account is gone
   */
  deleteAccount(userId: string): Observable<void> {
    return this.backendApiClient.delete<void>(
      API_ENDPOINT_PATHS.admin.user(userId),
      undefined,
      this.asTheOperator(),
    );
  }

  /**
   * Builds the options that make a request speak as the operator.
   *
   * @returns options carrying the admin token and keeping the interceptor out of the way
   */
  private asTheOperator(): BackendRequestOptions {
    return {
      withoutAuthorization: true,
      bearerToken: this.adminSessionStore.getAccessToken() ?? undefined,
    };
  }
}
