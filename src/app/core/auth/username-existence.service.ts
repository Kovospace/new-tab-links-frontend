import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { UsernameExistence } from '../api/models/username-existence.model';
import { RUNTIME_CONFIGURATION } from '../config/runtime-configuration';

/**
 * Asks the backend whether a username is already taken.
 *
 * <p>Separate from {@code AuthenticationService} on purpose: that class owns every way into and
 * out of a session, and this owns none of them. It answers a question about an account without
 * touching one, and it is the only caller of the one endpoint gated on the shared frontend API
 * key rather than on a bearer token.</p>
 *
 * <p>The endpoint deliberately discloses whether an account exists, which registration
 * deliberately does not. The API key is what limits that disclosure to callers who bothered to
 * read this site's {@code config.json} — a low bar, and the reason nothing of consequence may be
 * built on this answer. It is a courtesy to someone filling in a form, not an authority.</p>
 */
@Injectable({ providedIn: 'root' })
export class UsernameExistenceService {
  private readonly backendApiClient = inject(BackendApiClient);
  private readonly runtimeConfiguration = inject(RUNTIME_CONFIGURATION);

  /**
   * Whether this deployment can run the check at all.
   *
   * <p>False when no API key is configured, which is the state on a developer's machine and in
   * any deployment that has not set one. The backend denies the endpoint by default, so asking
   * without a key would only produce a guaranteed rejection per keystroke.</p>
   *
   * @returns true when a key is configured and the check is worth making
   */
  isUsernameExistenceCheckAvailable(): boolean {
    return this.runtimeConfiguration.frontendApiKey.length > 0;
  }

  /**
   * Asks whether an account with this username already exists.
   *
   * @param username the name to ask about, already trimmed and locally valid
   * @returns true when the name is taken, false when it is free
   */
  checkWhetherUsernameExists(username: string): Observable<boolean> {
    return this.backendApiClient
      .get<UsernameExistence>(
        API_ENDPOINT_PATHS.auth.usernameExistence,
        { username },
        { withoutAuthorization: true, withFrontendApiKey: true },
      )
      .pipe(map((existence) => existence.exists));
  }
}
