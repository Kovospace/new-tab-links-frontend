import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIGURATION } from '../config/runtime-configuration';
import { BackendApiClient } from './backend-api.client';

/** A deployment's configuration, as config.json would supply it. */
const DEPLOYED_CONFIGURATION = {
  backendBaseUrl: 'https://api.newtablinks.example',
  webClientDeviceName: 'NewTabLinks (production)',
  extensionDownload: { chromeWebStoreUrl: '', selfHostedCrxPath: '/downloads/newtablinks.crx' },
};

describe('BackendApiClient', () => {
  let backendApiClient: BackendApiClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIGURATION, useValue: DEPLOYED_CONFIGURATION },
      ],
    });

    backendApiClient = TestBed.inject(BackendApiClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('addresses the backend the deployment configured, not a compiled-in one', () => {
    backendApiClient.get('/api/v1/users/me').subscribe();

    httpTestingController.expectOne('https://api.newtablinks.example/api/v1/users/me').flush({});
  });

  it('reports the configured device name on requests that ask for it', () => {
    backendApiClient.post('/api/v1/auth/login', {}, { identifyThisDevice: true }).subscribe();

    const sentRequest = httpTestingController.expectOne(
      'https://api.newtablinks.example/api/v1/auth/login',
    );
    expect(sentRequest.request.headers.get('X-Device-Name')).toBe('NewTabLinks (production)');
    sentRequest.flush({});
  });

  it('sends no device name when the caller did not ask to be identified', () => {
    backendApiClient.post('/api/v1/auth/refresh', {}).subscribe();

    const sentRequest = httpTestingController.expectOne(
      'https://api.newtablinks.example/api/v1/auth/refresh',
    );
    expect(sentRequest.request.headers.has('X-Device-Name')).toBe(false);
    sentRequest.flush({});
  });
});
