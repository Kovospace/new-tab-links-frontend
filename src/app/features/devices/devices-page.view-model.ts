import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { UserDevice } from '../../core/api/models/user-device.model';
import { TranslationService } from '../../core/i18n/translation.service';
import { UserDeviceService } from '../../core/user/user-device.service';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';

/** Status the backend answers with when the device is not there to be removed. */
const DEVICE_ALREADY_GONE_STATUS = 404;

/**
 * One row of the device table, every value already worded and formatted.
 */
export interface PresentedDevice {
  /** Identifier, needed to sign the device out or to remove it. */
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
  /**
   * Whether removing the row is worth offering.
   *
   * <p>The exact inverse of {@link isSignOutOffered} today, and deliberately its own field rather
   * than a negation written in the template: the two are separate decisions that happen to agree,
   * and the backend would accept removing a signed-in device too.</p>
   */
  readonly isRemovalOffered: boolean;
  /** Whether this row is currently asking the user to confirm its removal. */
  readonly isRemovalConfirmationPending: boolean;
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
  private readonly actionSuccessMessage = signal('');
  private readonly deviceIdAwaitingRemovalConfirmation = signal('');
  private readonly isRemovingDevice = signal(false);

  /** Whether the list is being fetched, which is what the loading wording keys off. */
  readonly isLoading = this.isLoadingDevices.asReadonly();

  /** Why the list could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /**
   * Confirmation that a device was signed out or removed, empty until one is.
   *
   * <p>One signal serves both actions because only the latest of them is worth reporting, and two
   * would leave the page able to claim a sign-out and a removal at the same time.</p>
   */
  readonly actionConfirmation = this.actionSuccessMessage.asReadonly();

  /** Whether a removal is in flight, which is what disables the confirm button. */
  readonly isRemovalInFlight = this.isRemovingDevice.asReadonly();

  /** The devices, ready to render. */
  readonly presentedDevices = computed<readonly PresentedDevice[]>(() => {
    const activeLanguage = this.translationService.currentLanguageCode();
    const deviceIdAwaitingConfirmation = this.deviceIdAwaitingRemovalConfirmation();

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
      isRemovalOffered: !device.signedIn,
      isRemovalConfirmationPending: device.id === deviceIdAwaitingConfirmation,
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
   * tokens, because the history of where the account has been used is worth keeping. Removing the
   * row is the separate, explicit act in {@link confirmDeviceRemoval}.</p>
   *
   * @param deviceId identifier of the device to revoke
   */
  signOutDevice(deviceId: string): void {
    this.actionSuccessMessage.set('');
    this.loadFailureMessage.set('');

    this.userDeviceService.signOutDevice(deviceId).subscribe({
      next: () => {
        this.actionSuccessMessage.set(this.translationService.translate('devices.signOutSuccess'));
        this.loadDevices();
      },
      error: (failure: unknown) =>
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure)),
    });
  }

  /**
   * Asks the user to confirm removing one device, revealing that row's second press.
   *
   * <p>Removal cannot be undone, so the first press only offers the question — the same two-step
   * guard the account deletion panel uses. Only one row asks at a time: opening the question on a
   * second row withdraws it from the first, which keeps two confirm buttons from ever facing the
   * user at once.</p>
   *
   * @param deviceId identifier of the device the user pressed remove on
   */
  askToRemoveDevice(deviceId: string): void {
    this.deviceIdAwaitingRemovalConfirmation.set(deviceId);
    this.actionSuccessMessage.set('');
    this.loadFailureMessage.set('');
  }

  /**
   * Withdraws the removal question, leaving the device listed.
   */
  cancelDeviceRemoval(): void {
    this.deviceIdAwaitingRemovalConfirmation.set('');
  }

  /**
   * Removes one device from the list for good and refreshes what is left.
   *
   * <p>Irreversible: the row and the first-seen and last-used history on it are deleted. Should
   * that browser sign in again it returns as a new device, dated from that moment.</p>
   *
   * @param deviceId identifier of the device to remove
   */
  confirmDeviceRemoval(deviceId: string): void {
    this.isRemovingDevice.set(true);
    this.actionSuccessMessage.set('');
    this.loadFailureMessage.set('');

    this.userDeviceService.forgetDevice(deviceId).subscribe({
      next: () => {
        this.finishRemoval();
        this.reportRemovalDone();
      },
      error: (failure: unknown) => {
        this.finishRemoval();

        if (isDeviceAlreadyGone(failure)) {
          this.reportRemovalDone();
          return;
        }

        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }

  /**
   * Says the removal happened and reloads what is left.
   *
   * <p>Reached both when the backend removed the device and when it reported the device was
   * already gone, because those are the same outcome as far as the user is concerned.</p>
   */
  private reportRemovalDone(): void {
    this.actionSuccessMessage.set(this.translationService.translate('devices.removeSuccess'));
    this.loadDevices();
  }

  /**
   * Puts the removal state back as it was, whichever way the call went.
   *
   * <p>The question is withdrawn on failure as well as on success: the row it belonged to may no
   * longer be there, and leaving a confirm button pointed at a device that has just refused to be
   * removed only invites the same failure again.</p>
   */
  private finishRemoval(): void {
    this.isRemovingDevice.set(false);
    this.deviceIdAwaitingRemovalConfirmation.set('');
  }
}

/**
 * Whether a failed removal failed only because the device was not there any more.
 *
 * <p>The backend answers 404 once a device has been forgotten, so a list that went stale — a
 * second tab, or a removal already made from another browser — produces one. Reporting it as an
 * error would be wrong twice over: the device the user wanted gone is gone, and the wording would
 * blame them for a race they cannot see.</p>
 *
 * @param failure whatever the removal threw
 * @returns whether the device was already absent
 */
function isDeviceAlreadyGone(failure: unknown): boolean {
  return failure instanceof HttpErrorResponse && failure.status === DEVICE_ALREADY_GONE_STATUS;
}
