import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIGURATION } from '@app/core/config/runtime-configuration';
import { BackendApiClient } from '@app/core/api/backend-api.client';

/** A deployment's configuration, as config.json would supply it. */
const DEPLOYED_CONFIGURATION = {
  backendBaseUrl: 'https://api.newtablinks.example',
  webClientDeviceName: 'NewTabLinks (production)',
  frontendApiKey: 'the-shared-frontend-key',
  usernameCheckDebounceMilliseconds: 250,
  extensionDownload: { chromeWebStoreUrl: '' },
};

describe('BackendApiClient', () => {
  let backendApiClient: BackendApiClient;
  let httpTestingController: HttpTestingController;

  /**
   * Builds the client against a given deployment configuration.
   *
   * @param runtimeConfiguration what config.json would have supplied
   */
  function configureWith(runtimeConfiguration: unknown): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIGURATION, useValue: runtimeConfiguration },
      ],
    });

    backendApiClient = TestBed.inject(BackendApiClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => configureWith(DEPLOYED_CONFIGURATION));

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

  it('sends the frontend API key on the requests that ask for it', () => {
    backendApiClient
      .get('/api/v1/auth/username-existence', { username: 'alice' }, { withFrontendApiKey: true })
      .subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/username-existence'),
    );
    expect(sentRequest.request.headers.get('X-Frontend-Api-Key')).toBe('the-shared-frontend-key');
    sentRequest.flush({ exists: false });
  });

  it('omits the frontend API key header entirely when the deployment configured none', () => {
    configureWith({ ...DEPLOYED_CONFIGURATION, frontendApiKey: '' });

    backendApiClient
      .get('/api/v1/auth/username-existence', { username: 'alice' }, { withFrontendApiKey: true })
      .subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/username-existence'),
    );
    expect(sentRequest.request.headers.has('X-Frontend-Api-Key')).toBe(false);
    sentRequest.flush({ exists: false });
  });

  it('sends the metered pass a caller obtained, on the requests that carry one', () => {
    backendApiClient
      .post('/api/v1/auth/register', {}, { visitorToken: 'a-visitor-token' })
      .subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/register'),
    );
    expect(sentRequest.request.headers.get('X-Visitor-Token')).toBe('a-visitor-token');
    sentRequest.flush({});
  });

  it('omits the pass header entirely when there is no pass to send', () => {
    backendApiClient.post('/api/v1/auth/register', {}, { visitorToken: undefined }).subscribe();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/register'),
    );
    expect(sentRequest.request.headers.has('X-Visitor-Token')).toBe(false);
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
