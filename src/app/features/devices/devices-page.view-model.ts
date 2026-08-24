import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { UserDevice } from '../../core/api/models/user-device.model';
import { TranslationService } from '../../core/i18n/translation.service';
import { UserDeviceService } from '../../core/user/user-device.service';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';

/**
 * One row of the device table, every value already worded and formatted.
 */
export interface PresentedDevice {
  /** Identifier, needed to sign the device out. */
  readonly deviceId: string;
  /** Name of the machine as the client reported it. */
  readonly deviceName: string;
  /** Browser on that machine. */
  readonly browserName: string;
  /** When the account was first used from here, spelled out in the reader's language. */
  readonly firstSeenLabel: string;
  /** When the account was last used from here, spelled out in the reader's language. */
  readonly lastUsedLabel: string;
  /** Whether the device still holds a usable session, in words. */
  readonly stateLabel: string;
  /** Whether signing out is worth offering — a signed-out device has nothing to revoke. */
  readonly isSignOutOffered: boolean;
}

/**
 * State and behaviour behind the device list.
 *
 * <p>Every timestamp and every state is turned into finished text here, so the table binds
 * strings and nothing else. Because the formatting reads the active language, switching language
 * re-formats the dates without refetching anything.</p>
 *
 * <p>Minting the extension connect code is deliberately not part of this class: it is a separate
 * job with its own state, and it lives in its own view-model beside its own panel.</p>
 */
@Injectable()
export class DevicesPageViewModel {
  private readonly userDeviceService = inject(UserDeviceService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly loadedDevices = signal<readonly UserDevice[]>([]);
  private readonly isLoadingDevices = signal(false);
  private readonly loadFailureMessage = signal('');
  private readonly signOutSuccessMessage = signal('');

  /** Whether the list is being fetched, which is what the loading wording keys off. */
  readonly isLoading = this.isLoadingDevices.asReadonly();

  /** Why the list could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /** Confirmation that a device was signed out, empty until one is. */
  readonly signOutConfirmation = this.signOutSuccessMessage.asReadonly();

  /** The devices, ready to render. */
  readonly presentedDevices = computed<readonly PresentedDevice[]>(() => {
    const activeLanguage = this.translationService.currentLanguageCode();

    return this.loadedDevices().map((device) => ({
      deviceId: device.id,
      deviceName: device.deviceName,
      browserName: device.browserName,
      firstSeenLabel: formatInstantForDisplay(device.firstSeenAt, activeLanguage),
      lastUsedLabel: formatInstantForDisplay(device.lastUsedAt, activeLanguage),
      stateLabel: this.translationService.translate(
        device.signedIn ? 'devices.stateSignedIn' : 'devices.stateSignedOut',
      ),
      isSignOutOffered: device.signedIn,
    }));
  });

  /** Whether the account has never been used from anywhere, which reads differently from a failure. */
  readonly isDeviceListEmpty = computed<boolean>(
    () => !this.isLoadingDevices() && this.loadedDevices().length === 0,
  );

  /**
   * Fetches the device list.
   */
  loadDevices(): void {
    this.isLoadingDevices.set(true);
    this.loadFailureMessage.set('');

    this.userDeviceService.loadMyDevices().subscribe({
      next: (devices) => {
        this.loadedDevices.set(devices);
        this.isLoadingDevices.set(false);
      },
      error: (failure: unknown) => {
        this.isLoadingDevices.set(false);
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }

  /**
   * Signs one device out and refreshes the list.
   *
   * <p>The row does not disappear afterwards: the backend keeps the device and only revokes its
   * tokens, because the history of where the account has been used is worth keeping.</p>
   *
   * @param deviceId identifier of the device to revoke
   */
  signOutDevice(deviceId: string): void {
    this.signOutSuccessMessage.set('');
    this.loadFailureMessage.set('');

    this.userDeviceService.signOutDevice(deviceId).subscribe({
      next: () => {
        this.signOutSuccessMessage.set(this.translationService.translate('devices.signOutSuccess'));
        this.loadDevices();
      },
      error: (failure: unknown) =>
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure)),
    });
  }
}
