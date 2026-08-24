import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import {
  PasswordChangeRequest,
  PasswordResetConfirmation,
  PasswordResetRequest,
} from '../api/models/password.model';
import { RegistrationAccepted } from '../api/models/registration.model';

/**
 * Setting, changing and resetting a password.
 *
 * <p>All three sign every device out on the backend. That is deliberate: a password is usually
 * changed precisely when the old one cannot be trusted, so leaving the sessions it created alive
 * would achieve nothing. Any page calling these has to expect the current session to die too.</p>
 */
@Injectable({ providedIn: 'root' })
export class PasswordService {
  private readonly backendApiClient = inject(BackendApiClient);

  /**
   * Asks for a password reset link.
   *
   * <p>The backend always accepts, saying nothing about whether the address belongs to an
   * account, so the wording it returns must be shown as received.</p>
   *
   * @param resetRequest the address to send the link to
   * @returns the backend's uniform acknowledgement
   */
  requestPasswordReset(resetRequest: PasswordResetRequest): Observable<RegistrationAccepted> {
    return this.backendApiClient.post<RegistrationAccepted>(
      API_ENDPOINT_PATHS.password.resetRequest,
      resetRequest,
      { withoutAuthorization: true },
    );
  }

  /**
   * Sets a new password from the token in a reset link.
   *
   * @param confirmation the token and the password to set
   * @returns an observable that completes once the password is set
   */
  confirmPasswordReset(confirmation: PasswordResetConfirmation): Observable<void> {
    return this.backendApiClient.post<void>(
      API_ENDPOINT_PATHS.password.resetConfirm,
      confirmation,
      { withoutAuthorization: true },
    );
  }

  /**
   * Sets or changes the signed-in user's password.
   *
   * <p>One endpoint covers both. {@code currentPassword} is required only when the account
   * already has one; an account created through Google has none, and this is how its owner gives
   * it one — there is nothing to prove, because the caller is already authenticated.</p>
   *
   * @param changeRequest the current password when there is one, and the password to set
   * @returns an observable that completes once the password is set
   */
  setOrChangeMyPassword(changeRequest: PasswordChangeRequest): Observable<void> {
    return this.backendApiClient.post<void>(API_ENDPOINT_PATHS.password.change, changeRequest);
  }
}
