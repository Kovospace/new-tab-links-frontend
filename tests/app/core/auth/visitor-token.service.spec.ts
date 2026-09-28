import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { BackendApiClient } from '@app/core/api/backend-api.client';
import { RUNTIME_CONFIGURATION } from '@app/core/config/runtime-configuration';
import { VisitorTokenService } from '@app/core/auth/visitor-token.service';

/** How long the backend says a freshly issued pass must be held before its first use. */
const FIRST_USE_DELAY_MILLISECONDS = 500;

/** Shortest gap the backend allows between two calls made with one pass. */
const REQUEST_INTERVAL_MILLISECONDS = 200;

/** A deployment pointing at a real backend. */
const DEPLOYED_CONFIGURATION = {
  backendBaseUrl: 'https://api.newtablinks.example',
  webClientDeviceName: 'NewTabLinks (production)',
  frontendApiKey: 'the-shared-frontend-key',
  usernameCheckDebounceMilliseconds: 250,
  extensionDownload: { chromeWebStoreUrl: '', selfHostedCrxPath: '' },
};

/** A path standing in for whichever metered endpoint is being called. */
const A_METERED_PATH = '/api/v1/auth/username-existence';

describe('VisitorTokenService', () => {
  let httpTestingController: HttpTestingController;
  let visitorTokenService: VisitorTokenService;
  let backendApiClient: BackendApiClient;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIGURATION, useValue: DEPLOYED_CONFIGURATION },
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    visitorTokenService = TestBed.inject(VisitorTokenService);
    backendApiClient = TestBed.inject(BackendApiClient);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpTestingController.verify();
  });

  /** Makes the metered call the service is wrapping. */
  const callAMeteredEndpoint = (): Observable<unknown> =>
    visitorTokenService.runWithVisitorToken((visitorToken) =>
      backendApiClient.get(A_METERED_PATH, undefined, { visitorToken }),
    );

  /**
   * Answers the request for a pass.
   *
   * @param token the value the backend hands out
   */
  function issueVisitorToken(token: string): void {
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/visitor-token'))
      .flush({
        token,
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        minimumFirstUseDelayMilliseconds: FIRST_USE_DELAY_MILLISECONDS,
        minimumRequestIntervalMilliseconds: REQUEST_INTERVAL_MILLISECONDS,
        maximumUses: 250,
      });
  }

  /** Takes the one outstanding call to the metered endpoint. */
  const theMeteredRequest = () =>
    httpTestingController.expectOne((request) => request.url.endsWith(A_METERED_PATH));

  it('obtains a pass, holds it for the stated delay, then presents it', () => {
    callAMeteredEndpoint().subscribe();

    issueVisitorToken('the-first-pass');
    httpTestingController.expectNone((request) => request.url.endsWith(A_METERED_PATH));

    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);

    const sentRequest = theMeteredRequest();
    expect(sentRequest.request.headers.get('X-Visitor-Token')).toBe('the-first-pass');
    sentRequest.flush({});
  });

  it('keeps the pass it already holds, waiting only the gap between calls', () => {
    callAMeteredEndpoint().subscribe();
    issueVisitorToken('the-first-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
    theMeteredRequest().flush({});

    callAMeteredEndpoint().subscribe();

    httpTestingController.expectNone((request) => request.url.endsWith('/visitor-token'));
    vi.advanceTimersByTime(REQUEST_INTERVAL_MILLISECONDS);

    const secondRequest = theMeteredRequest();
    expect(secondRequest.request.headers.get('X-Visitor-Token')).toBe('the-first-pass');
    secondRequest.flush({});
  });

  it('replaces a pass the backend refused with 401, and retries once', () => {
    callAMeteredEndpoint().subscribe();
    issueVisitorToken('the-spent-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
    theMeteredRequest().flush({}, { status: 401, statusText: 'Unauthorized' });

    issueVisitorToken('the-replacement-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);

    const retriedRequest = theMeteredRequest();
    expect(retriedRequest.request.headers.get('X-Visitor-Token')).toBe('the-replacement-pass');
    retriedRequest.flush({});
  });

  it('gives up after one replacement rather than asking for passes in a loop', () => {
    let reportedFailure: unknown = null;
    callAMeteredEndpoint().subscribe({ error: (failure: unknown) => (reportedFailure = failure) });

    issueVisitorToken('the-spent-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
    theMeteredRequest().flush({}, { status: 401, statusText: 'Unauthorized' });

    issueVisitorToken('the-replacement-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
    theMeteredRequest().flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(reportedFailure).not.toBeNull();
  });

  it('does not replace a pass over a 429, which a new pass would not cure', () => {
    let reportedFailure: unknown = null;
    callAMeteredEndpoint().subscribe({ error: (failure: unknown) => (reportedFailure = failure) });

    issueVisitorToken('the-first-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
    theMeteredRequest().flush({}, { status: 429, statusText: 'Too Many Requests' });

    expect(reportedFailure).not.toBeNull();
  });

  it('calls without a pass when one cannot be obtained, rather than refusing to call', () => {
    callAMeteredEndpoint().subscribe();

    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/visitor-token'))
      .flush({}, { status: 503, statusText: 'Service Unavailable' });

    const sentRequest = theMeteredRequest();
    expect(sentRequest.request.headers.has('X-Visitor-Token')).toBe(false);
    sentRequest.flush({});
  });

  it('asks for one pass, not one per call, when several calls start together', () => {
    callAMeteredEndpoint().subscribe();
    callAMeteredEndpoint().subscribe();

    issueVisitorToken('the-only-pass');
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);

    httpTestingController
      .match((request) => request.url.endsWith(A_METERED_PATH))
      .forEach((request) => request.flush({}));
  });
});
