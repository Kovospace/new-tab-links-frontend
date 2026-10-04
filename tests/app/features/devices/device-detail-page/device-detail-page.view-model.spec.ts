import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { DeviceInventory } from '@app/core/api/models/device-inventory.model';
import { UserDevice } from '@app/core/api/models/user-device.model';
import { TranslationService } from '@app/core/i18n/translation.service';
import { DeviceDetailPageViewModel } from '@app/features/devices/device-detail-page/device-detail-page.view-model';

/** The device the page is opened on. */
const DEVICE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

/** The account's device list, holding the device the page names in its heading. */
const DEVICES: readonly UserDevice[] = [
  {
    id: DEVICE_ID,
    deviceName: 'Work laptop',
    browserName: 'Firefox',
    firstSeenAt: '2026-01-05T08:00:00Z',
    lastUsedAt: '2026-08-24T10:15:30Z',
    signedIn: true,
    syncSummary: 'PARTIAL',
    inventoryReportedAt: '2026-08-24T10:15:30Z',
  },
];

/** What the device reported: one profile, one workspace in a slot and one over the free limit. */
const INVENTORY: DeviceInventory = {
  reportedAt: '2026-08-24T10:15:30Z',
  profiles: [
    {
      accountId: 'p1',
      name: 'Default',
      syncState: 'SYNCHRONISED',
      workspaces: [
        {
          accountId: 'w1',
          name: 'Work',
          syncState: 'SYNCHRONISED',
          groupCount: 3,
          subgroupCount: 1,
          linkCount: 42,
        },
        {
          accountId: null,
          name: 'Hobby',
          syncState: 'LOCAL_ONLY_FREE_LIMIT',
          groupCount: 1,
          subgroupCount: 0,
          linkCount: 7,
        },
      ],
    },
  ],
};

/** The wording under test. */
const TRANSLATIONS = {
  devices: {
    inventoryState: {
      SYNCHRONISED: 'Synchronised',
      LOCAL_ONLY_FREE_LIMIT: 'Only on this device',
      UNKNOWN: 'Unknown',
    },
    detail: { heading: 'Device', headingForDevice: '{deviceName} ({browserName})' },
  },
};

describe('DeviceDetailPageViewModel', () => {
  let viewModel: DeviceDetailPageViewModel;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DeviceDetailPageViewModel,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ deviceId: DEVICE_ID }) } },
        },
      ],
    });
    viewModel = TestBed.inject(DeviceDetailPageViewModel);
    httpTestingController = TestBed.inject(HttpTestingController);

    const loadingEnglish = TestBed.inject(TranslationService).changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush(TRANSLATIONS);
    await loadingEnglish;
  });

  afterEach(() => httpTestingController.verify());

  /** Answers the device list request. */
  function respondWithDevices(): void {
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/users/me/devices'))
      .flush(DEVICES);
  }

  /**
   * Answers the inventory request.
   *
   * @param inventory the report, or {@code null} for a device that never reported
   */
  function respondWithInventory(inventory: DeviceInventory | null): void {
    const request = httpTestingController.expectOne((candidate) =>
      candidate.url.endsWith(`/api/v1/users/me/devices/${DEVICE_ID}/inventory`),
    );
    if (inventory === null) {
      request.flush(null, { status: 404, statusText: 'Not Found' });
    } else {
      request.flush(inventory);
    }
  }

  it('names the device and words every profile and workspace it reported', () => {
    viewModel.loadDetail();
    respondWithDevices();
    respondWithInventory(INVENTORY);

    expect(viewModel.heading()).toBe('Work laptop (Firefox)');
    const [profile] = viewModel.presentedProfiles();
    expect(profile.syncLabel).toBe('Synchronised');
    expect(profile.workspaces.map((workspace) => workspace.syncLabel)).toEqual([
      'Synchronised',
      'Only on this device',
    ]);
    expect(profile.workspaces[0].linkCountLabel).toBe('42');
    expect(profile.workspaces[0].groupCountLabel).toBe('3');
  });

  it('reads a device that never reported as no report, not as a failure', () => {
    viewModel.loadDetail();
    respondWithDevices();
    respondWithInventory(null);

    expect(viewModel.hasNoReport()).toBe(true);
    expect(viewModel.loadFailure()).toBe('');
    expect(viewModel.presentedProfiles()).toEqual([]);
  });

  it('words a state this build does not know as unknown', () => {
    viewModel.loadDetail();
    respondWithDevices();
    respondWithInventory({
      ...INVENTORY,
      profiles: [{ ...INVENTORY.profiles[0], syncState: 'SOMETHING_NEWER' as never }],
    });

    expect(viewModel.presentedProfiles()[0].syncLabel).toBe('Unknown');
  });
});
