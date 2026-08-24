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
  devices: { stateSignedIn: 'Signed in', stateSignedOut: 'Signed out' },
};

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

  it('words a failed load instead of leaving the page blank', () => {
    viewModel.loadDevices();
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/users/me/devices'))
      .flush('', { status: 500, statusText: 'Internal Server Error' });

    expect(viewModel.loadFailure().length).toBeGreaterThan(0);
    expect(viewModel.isLoading()).toBe(false);
  });
});
