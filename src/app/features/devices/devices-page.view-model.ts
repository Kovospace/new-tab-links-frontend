import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { DeviceSyncSummary, UserDevice } from '../../core/api/models/user-device.model';
import { buildDeviceDetailLink } from '../../core/routing/application-route-paths';
import { TranslationService } from '../../core/i18n/translation.service';
import { UserDeviceService } from '../../core/user/user-device.service';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';
import { createSelfClearingMessage } from '../../shared/messaging/self-clearing-message';

/** Every synchronisation summary this build has wording for; anything else reads as unknown. */
const WORDED_SYNC_SUMMARIES: readonly DeviceSyncSummary[] = [
  'SYNCHRONISED',
  'PARTIAL',
  'NOT_SYNCHRONISED',
  'UNKNOWN',
];

/** Status the backend answers with when the device is not there to be removed. */
const DEVICE_ALREADY_GONE_STATUS = 404;

/**
 * How long a confirmation stays on screen, in milliseconds.
 *
 * <p>Long enough to be read without hurrying, short enough that it is gone before it can be
 * mistaken for a report on whatever the reader does next.</p>
 */
const CONFIRMATION_LIFETIME_MILLISECONDS = 10_000;

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
  /** How much of what the device holds synchronises, in words. */
  readonly syncLabel: string;
  /** Where its detail page is: which of its profiles and workspaces synchronise. */
  readonly detailLink: string;
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
  private readonly actionSuccessMessage = createSelfClearingMessage(
    CONFIRMATION_LIFETIME_MILLISECONDS,
  );
  private readonly deviceIdAwaitingRemoval = signal('');
  private readonly isRemovingDevice = signal(false);

  /** Whether the list is being fetched, which is what the loading wording keys off. */
  readonly isLoading = this.isLoadingDevices.asReadonly();

  /** Why the list could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /**
   * Confirmation that a device was signed out or removed, empty until one is.
   *
   * <p>One signal serves both actions because only the latest of them is worth reporting, and two
   * would leave the page able to claim a sign-out and a removal at the same time. It removes
   * itself after a few seconds — see {@code SelfClearingMessage} for why a confirmation should
   * not outlive the moment it describes. Failures do not, and are on {@link loadFailure}.</p>
   */
  readonly actionConfirmation = this.actionSuccessMessage.value;

  /** Whether a removal is in flight, which is what disables the confirm button. */
  readonly isRemovalInFlight = this.isRemovingDevice.asReadonly();

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
      syncLabel: this.translationService.translate(
        `devices.sync.${wordableSyncSummary(device.syncSummary)}`,
      ),
      detailLink: buildDeviceDetailLink(device.id),
      isSignOutOffered: device.signedIn,
      isRemovalOffered: !device.signedIn,
    }));
  });

  /**
   * The device a removal has been asked for but not yet confirmed, or null when none is.
   *
   * <p>Derived from the identifier rather than holding a row of its own, so that the dialog shows
   * the same finished text the table does and re-words itself when the language changes.</p>
   */
  readonly devicePendingRemoval = computed<PresentedDevice | null>(() => {
    const deviceId = this.deviceIdAwaitingRemoval();

    return this.presentedDevices().find((device) => device.deviceId === deviceId) ?? null;
  });

  /** The dialog's warning, naming the device it is about; empty when no dialog is open. */
  readonly removalWarning = computed<string>(() => {
    const device = this.devicePendingRemoval();

    return device === null
      ? ''
      : this.translationService.translate('devices.removeWarning', {
          deviceName: device.deviceName,
          browserName: device.browserName,
        });
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
    this.actionSuccessMessage.clear();
    this.loadFailureMessage.set('');

    this.userDeviceService.signOutDevice(deviceId).subscribe({
      next: () => {
        this.actionSuccessMessage.show(this.translationService.translate('devices.signOutSuccess'));
        this.loadDevices();
      },
      error: (failure: unknown) =>
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure)),
    });
  }

  /**
   * Arms the removal of one device, without performing it.
   *
   * <p>Removal cannot be undone, so the press only opens the dialog that asks — the same guard,
   * and the same dialog, the operator's account list uses. Holding the identifier rather than a
   * flag per row is what keeps two dialogs from ever being open at once.</p>
   *
   * @param deviceId identifier of the device the user pressed remove on
   */
  askToRemoveDevice(deviceId: string): void {
    this.deviceIdAwaitingRemoval.set(deviceId);
    this.actionSuccessMessage.clear();
    this.loadFailureMessage.set('');
  }

  /**
   * Closes the dialog without removing anything, leaving the device listed.
   */
  cancelDeviceRemoval(): void {
    this.deviceIdAwaitingRemoval.set('');
  }

  /**
   * Removes one device from the list for good and refreshes what is left.
   *
   * <p>Irreversible: the row and the first-seen and last-used history on it are deleted. Should
   * that browser sign in again it returns as a new device, dated from that moment.</p>
   *
   * <p>A device the backend says was already gone takes the same path as one it has just deleted,
   * because the outcome the user asked for is the same either way and a 404 there is a race they
   * cannot see.</p>
   *
   * <p>Takes no argument, because the device is whichever one the open dialog is about. A press on
   * a confirm button that no dialog belongs to does nothing.</p>
   */
  confirmDeviceRemoval(): void {
    const device = this.devicePendingRemoval();
    if (device === null) {
      return;
    }

    const deviceId = device.deviceId;
    this.isRemovingDevice.set(true);
    this.actionSuccessMessage.clear();
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
    this.actionSuccessMessage.show(this.translationService.translate('devices.removeSuccess'));
    this.loadDevices();
  }

  /**
   * Puts the removal state back as it was, whichever way the call went.
   *
   * <p>The dialog closes on failure as well as on success: the device it was about may no longer
   * be there, and leaving it open over a removal that has just been refused only invites the same
   * failure again. The wording of the failure is on the page behind it.</p>
   */
  private finishRemoval(): void {
    this.isRemovingDevice.set(false);
    this.deviceIdAwaitingRemoval.set('');
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

/**
 * Narrows a summary to one this build has wording for.
 *
 * <p>The backend may grow the set; a summary this build has never heard of is shown as unknown
 * rather than as its raw constant.</p>
 *
 * @param syncSummary the summary as the backend sent it
 * @returns the same summary, or {@code UNKNOWN}
 */
function wordableSyncSummary(syncSummary: DeviceSyncSummary | undefined): DeviceSyncSummary {
  return syncSummary !== undefined && WORDED_SYNC_SUMMARIES.includes(syncSummary)
    ? syncSummary
    : 'UNKNOWN';
}
