import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT_PATHS } from '../api/api-endpoint-paths';
import { BackendApiClient } from '../api/backend-api.client';
import { ExtensionConnectCode } from '../api/models/authentication-request.model';
import { UserDevice } from '../api/models/user-device.model';

/**
 * The browsers an account has been used from, and how a new one is connected.
 *
 * <p>Minting a connect code sits here rather than with the sign-in service on purpose: it is not
 * a way in, it is something an already signed-in user does to bring another browser along. See
 * {@link mintExtensionConnectCode}.</p>
 */
@Injectable({ providedIn: 'root' })
export class UserDeviceService {
  private readonly backendApiClient = inject(BackendApiClient);

  /**
   * Lists where the account has been signed in from, most recently used first.
   *
   * @returns the devices, as history rather than as live sessions
   */
  loadMyDevices(): Observable<readonly UserDevice[]> {
    return this.backendApiClient.get<readonly UserDevice[]>(API_ENDPOINT_PATHS.user.myDevices);
  }

  /**
   * Signs one device out, revoking every token it holds.
   *
   * <p>The device stays in the list afterwards: the history of where the account has been used
   * is worth keeping, and the list would otherwise appear to lose entries.</p>
   *
   * @param deviceId identifier of the device to revoke
   * @returns an observable that completes once the tokens are revoked
   */
  signOutDevice(deviceId: string): Observable<void> {
    return this.backendApiClient.delete<void>(API_ENDPOINT_PATHS.user.myDevice(deviceId));
  }

  /**
   * Mints a code for the user to type into the browser extension.
   *
   * <p>This is how an account created through Google signs the extension in. Such an account has
   * no password, so the extension's username-and-password form could never work for it; instead
   * the website — where the user is already signed in — mints a short code, the user retypes it,
   * and the extension trades it for an ordinary token pair.</p>
   *
   * <p>The code is valid for about ten minutes and works exactly once.</p>
   *
   * @returns the code to display and the moment it stops working
   */
  mintExtensionConnectCode(): Observable<ExtensionConnectCode> {
    return this.backendApiClient.post<ExtensionConnectCode>(
      API_ENDPOINT_PATHS.auth.mintExtensionConnectCode,
      null,
    );
  }
}
