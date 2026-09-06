import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserDevice } from '../../core/api/models/user-device.model';
import { TranslationService } from '../../core/i18n/translation.service';
import { DevicesPageViewModel } from './devices-page.view-model';

/** Two devices as the backend would report them: one live session, one long finished. */
const REPORTED_DEVICES: readonly UserDevice[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    deviceName: 'Work laptop',
    browserName: 'Firefox',
    firstSeenAt: '2026-01-05T08:00:00Z',
    lastUsedAt: '2026-08-24T10:15:30Z',
    signedIn: true,
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    deviceName: 'Unnamed device',
    browserName: 'Chrome',
    firstSeenAt: '2025-11-02T19:30:00Z',
    lastUsedAt: '2025-12-24T21:00:00Z',
    signedIn: false,
  },
];

/** The translation file the wording under test comes from. */
const DEVICE_TRANSLATIONS = {
  devices: {
    stateSignedIn: 'Signed in',
    stateSignedOut: 'Signed out',
    removeSuccess: 'That device was removed from the list.',
    removeWarning: '{deviceName} ({browserName}) stops being listed.',
  },
};

/** How long a confirmation stays on screen, mirroring the view-model's own constant. */
const CONFIRMATION_LIFETIME_MILLISECONDS = 10_000;

/** Identifier of the signed-out device, the only kind the list offers to remove. */
const SIGNED_OUT_DEVICE_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('DevicesPageViewModel', () => {
  let viewModel: DevicesPageViewModel;
  let httpTestingController: HttpTestingController;
  let translationService: TranslationService;

  beforeEach(async () => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DevicesPageViewModel],
    });

    viewModel = TestBed.inject(DevicesPageViewModel);
    httpTestingController = TestBed.inject(HttpTestingController);
    translationService = TestBed.inject(TranslationService);

    const loadingEnglish = translationService.changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush(DEVICE_TRANSLATIONS);
    await loadingEnglish;
  });

  afterEach(() => httpTestingController.verify());

  /**
   * Answers the device request the view-model makes.
   *
   * @param devices what the backend should report
   */
  function respondWithDevices(devices: readonly UserDevice[]): void {
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/users/me/devices'))
      .flush(devices);
  }

  /**
   * Answers the removal request the view-model makes, asserting that it asked to forget rather
   * than merely to sign out.
   *
   * @param deviceId identifier the request must address
   */
  function respondToRemovalOf(deviceId: string): void {
    const removalRequest = httpTestingController.expectOne(
      (request) => request.method === 'DELETE' && request.url.endsWith(`/devices/${deviceId}`),
    );

    expect(removalRequest.request.params.get('deleteAndForget')).toBe('true');
    removalRequest.flush(null, { status: 204, statusText: 'No Content' });
  }

  it('hands the template finished text for every column', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    const [firstDevice] = viewModel.presentedDevices();

    expect(firstDevice.deviceName).toBe('Work laptop');
    expect(firstDevice.browserName).toBe('Firefox');
    expect(firstDevice.stateLabel).toBe('Signed in');
    expect(firstDevice.firstSeenLabel).toContain('2026');
    expect(firstDevice.lastUsedLabel).toContain('2026');
  });

  it('offers signing out only for a device that still holds a session', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    const [liveDevice, finishedDevice] = viewModel.presentedDevices();

    expect(liveDevice.isSignOutOffered).toBe(true);
    expect(finishedDevice.isSignOutOffered).toBe(false);
    expect(finishedDevice.stateLabel).toBe('Signed out');
  });

  it('re-words and re-formats the rows when the language changes, without refetching', async () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    const loadingSlovak = translationService.changeLanguage('sk');
    httpTestingController.expectOne('i18n/sk.json').flush({
      devices: { stateSignedIn: 'Prihlásené', stateSignedOut: 'Odhlásené' },
    });
    await loadingSlovak;

    expect(viewModel.presentedDevices()[0].stateLabel).toBe('Prihlásené');
    httpTestingController.verify();
  });

  it('reports an empty account as empty rather than as a failure', () => {
    viewModel.loadDevices();
    respondWithDevices([]);

    expect(viewModel.isDeviceListEmpty()).toBe(true);
    expect(viewModel.loadFailure()).toBe('');
  });

  it('offers removal exactly where it does not offer signing out', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    const [liveDevice, finishedDevice] = viewModel.presentedDevices();

    expect(liveDevice.isRemovalOffered).toBe(false);
    expect(finishedDevice.isRemovalOffered).toBe(true);
  });

  it('opens the dialog on the named device, and removes nothing until it is confirmed', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);

    expect(viewModel.devicePendingRemoval()?.deviceId).toBe(SIGNED_OUT_DEVICE_ID);
    httpTestingController.verify();
  });

  it('names the device in the dialog wording', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);

    expect(viewModel.removalWarning()).toBe('Unnamed device (Chrome) stops being listed.');
  });

  it('has no dialog and no wording while none is armed', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    expect(viewModel.devicePendingRemoval()).toBeNull();
    expect(viewModel.removalWarning()).toBe('');
  });

  it('closes the dialog and leaves the device listed when the removal is abandoned', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);
    viewModel.cancelDeviceRemoval();

    expect(viewModel.devicePendingRemoval()).toBeNull();
    expect(viewModel.presentedDevices().length).toBe(2);
    httpTestingController.verify();
  });

  it('removes nothing when confirmed with no dialog open', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.confirmDeviceRemoval();

    httpTestingController.verify();
  });

  it('asks the backend to forget the device, then refreshes the list', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);
    viewModel.confirmDeviceRemoval();
    respondToRemovalOf(SIGNED_OUT_DEVICE_ID);
    respondWithDevices([REPORTED_DEVICES[0]]);

    expect(viewModel.presentedDevices().length).toBe(1);
    expect(viewModel.isRemovalInFlight()).toBe(false);
  });

  it('confirms the removal, and withdraws the confirmation once it has been read', () => {
    vi.useFakeTimers();

    try {
      viewModel.loadDevices();
      respondWithDevices(REPORTED_DEVICES);

      viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);
      viewModel.confirmDeviceRemoval();
      respondToRemovalOf(SIGNED_OUT_DEVICE_ID);
      respondWithDevices([REPORTED_DEVICES[0]]);

      expect(viewModel.actionConfirmation()).toBe('That device was removed from the list.');

      vi.advanceTimersByTime(CONFIRMATION_LIFETIME_MILLISECONDS);

      expect(viewModel.actionConfirmation()).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('withdraws the question and words the failure when the removal is refused', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);
    viewModel.confirmDeviceRemoval();
    httpTestingController
      .expectOne((request) => request.method === 'DELETE')
      .flush('', { status: 500, statusText: 'Internal Server Error' });

    expect(viewModel.loadFailure().length).toBeGreaterThan(0);
    expect(viewModel.actionConfirmation()).toBe('');
    expect(viewModel.isRemovalInFlight()).toBe(false);
    expect(viewModel.devicePendingRemoval()).toBeNull();
  });

  it('treats a device that is already gone as removed rather than as a failure', () => {
    viewModel.loadDevices();
    respondWithDevices(REPORTED_DEVICES);

    viewModel.askToRemoveDevice(SIGNED_OUT_DEVICE_ID);
    viewModel.confirmDeviceRemoval();
    httpTestingController
      .expectOne((request) => request.method === 'DELETE')
      .flush('', { status: 404, statusText: 'Not Found' });
    respondWithDevices([REPORTED_DEVICES[0]]);

    expect(viewModel.actionConfirmation()).toBe('That device was removed from the list.');
    expect(viewModel.loadFailure()).toBe('');
    expect(viewModel.presentedDevices().length).toBe(1);
  });

  it('words a failed load instead of leaving the page blank', () => {
    viewModel.loadDevices();
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/users/me/devices'))
      .flush('', { status: 500, statusText: 'Internal Server Error' });

    expect(viewModel.loadFailure().length).toBeGreaterThan(0);
    expect(viewModel.isLoading()).toBe(false);
  });
});
