import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { BackendFailureTranslator } from '../../../core/api/backend-failure.translator';
import {
  DeviceInventory,
  InventoryProfile,
  InventorySyncState,
  InventoryWorkspace,
} from '../../../core/api/models/device-inventory.model';
import { UserDevice } from '../../../core/api/models/user-device.model';
import { TranslationService } from '../../../core/i18n/translation.service';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';
import { UserDeviceService } from '../../../core/user/user-device.service';
import { formatInstantForDisplay } from '../../../shared/formatting/instant-formatter';

/** Status the backend answers with when the device has never reported what it holds. */
const NO_INVENTORY_STATUS = 404;

/** Every inventory state this build has wording for; anything else reads as unknown. */
const WORDED_SYNC_STATES: readonly InventorySyncState[] = [
  'SYNCHRONISED',
  'LOCAL_ONLY_FREE_LIMIT',
  'LOCAL_ONLY_FAIR_USE',
  'EXAMPLE',
];

/** One workspace row, every value finished text. */
export interface PresentedInventoryWorkspace {
  readonly name: string;
  /** Whether, and why not, it synchronises. */
  readonly syncLabel: string;
  readonly groupCountLabel: string;
  readonly linkCountLabel: string;
}

/** One profile and its workspaces, every value finished text. */
export interface PresentedInventoryProfile {
  readonly name: string;
  /** Whether, and why not, it synchronises. */
  readonly syncLabel: string;
  readonly workspaces: readonly PresentedInventoryWorkspace[];
}

/**
 * State behind one device's detail page: which of its profiles and workspaces synchronise.
 *
 * <p>The audit the devices page promises a user over a limit — "where am I bleeding out". The data
 * is the installation's own report, because what does not synchronise never reaches the account;
 * the device list is loaded alongside only to name the device in the heading.</p>
 */
@Injectable()
export class DeviceDetailPageViewModel {
  private readonly userDeviceService = inject(UserDeviceService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  /** The device this page is about, from its address. */
  private readonly deviceId = inject(ActivatedRoute).snapshot.paramMap.get('deviceId') ?? '';

  private readonly loadedDevice = signal<UserDevice | null>(null);
  private readonly loadedInventory = signal<DeviceInventory | null>(null);
  private readonly isLoadingDetail = signal(false);
  private readonly hasLoaded = signal(false);
  private readonly loadFailureMessage = signal('');

  /** Where the back link goes. */
  readonly devicesLink = APPLICATION_ROUTE_LINKS.devices;

  /** Whether the page is being fetched. */
  readonly isLoading = this.isLoadingDetail.asReadonly();

  /** Why the page could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /** The device's name and browser, or the generic heading while it is not known. */
  readonly heading = computed<string>(() => {
    const device = this.loadedDevice();
    return device === null
      ? this.translationService.translate('devices.detail.heading')
      : this.translationService.translate('devices.detail.headingForDevice', {
          deviceName: device.deviceName,
          browserName: device.browserName,
        });
  });

  /**
   * Whether the device has never said what it holds — a website sign-in, or an extension that has
   * not synchronised since reporting began. Not a failure, so worded apart from one.
   */
  readonly hasNoReport = computed<boolean>(
    () => this.hasLoaded() && this.loadFailure() === '' && this.loadedInventory() === null,
  );

  /** When the report was made, as a sentence; empty without one. */
  readonly reportedAtLabel = computed<string>(() => {
    const inventory = this.loadedInventory();
    return inventory === null
      ? ''
      : this.translationService.translate('devices.detail.reportedAt', {
          date: formatInstantForDisplay(
            inventory.reportedAt,
            this.translationService.currentLanguageCode(),
          ),
        });
  });

  /** The profiles and their workspaces, ready to render. */
  readonly presentedProfiles = computed<readonly PresentedInventoryProfile[]>(
    () => this.loadedInventory()?.profiles.map((profile) => this.presentProfile(profile)) ?? [],
  );

  /** Fetches the device and its report. */
  loadDetail(): void {
    this.isLoadingDetail.set(true);
    this.loadFailureMessage.set('');

    forkJoin({
      devices: this.userDeviceService.loadMyDevices(),
      inventory: this.userDeviceService
        .loadDeviceInventory(this.deviceId)
        .pipe(catchError((failure: unknown) => absentWhenNeverReported(failure))),
    }).subscribe({
      next: ({ devices, inventory }) => {
        this.loadedDevice.set(devices.find((device) => device.id === this.deviceId) ?? null);
        this.loadedInventory.set(inventory);
        this.finishLoading();
      },
      error: (failure: unknown) => {
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure));
        this.finishLoading();
      },
    });
  }

  /** Marks the fetch as over, whichever way it went. */
  private finishLoading(): void {
    this.isLoadingDetail.set(false);
    this.hasLoaded.set(true);
  }

  /**
   * Words one profile and its workspaces.
   *
   * @param profile the profile as reported
   * @returns it, ready to bind
   */
  private presentProfile(profile: InventoryProfile): PresentedInventoryProfile {
    return {
      name: profile.name,
      syncLabel: this.wordSyncState(profile.syncState),
      workspaces: profile.workspaces.map((workspace) => this.presentWorkspace(workspace)),
    };
  }

  /**
   * Words one workspace.
   *
   * @param workspace the workspace as reported
   * @returns it, ready to bind
   */
  private presentWorkspace(workspace: InventoryWorkspace): PresentedInventoryWorkspace {
    return {
      name: workspace.name,
      syncLabel: this.wordSyncState(workspace.syncState),
      groupCountLabel: String(workspace.groupCount),
      linkCountLabel: String(workspace.linkCount),
    };
  }

  /**
   * Words a sync state, as unknown when this build has never heard of it.
   *
   * @param syncState the state as reported
   * @returns its wording
   */
  private wordSyncState(syncState: InventorySyncState): string {
    const wordable = WORDED_SYNC_STATES.includes(syncState) ? syncState : 'UNKNOWN';
    return this.translationService.translate(`devices.inventoryState.${wordable}`);
  }
}

/**
 * Turns "this device never reported" into an absent inventory, and lets any other failure through.
 *
 * @param failure what the inventory call failed with
 * @returns an observable of {@code null} for a 404, otherwise the failure again
 */
function absentWhenNeverReported(failure: unknown) {
  return failure instanceof HttpErrorResponse && failure.status === NO_INVENTORY_STATUS
    ? of(null)
    : throwError(() => failure);
}
