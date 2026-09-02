import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIGURATION } from '../../core/config/runtime-configuration';
import { RegisterPageViewModel } from './register-page.view-model';

/** How long the view-model waits for typing to stop before it asks the backend. */
const DEBOUNCE_MILLISECONDS = 250;

/** How long the backend says a freshly issued pass must be held before its first use. */
const FIRST_USE_DELAY_MILLISECONDS = 500;

/** A pass, as the backend issues it. */
const AN_ISSUED_VISITOR_TOKEN = {
  token: 'a-visitor-token',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  minimumFirstUseDelayMilliseconds: FIRST_USE_DELAY_MILLISECONDS,
  minimumRequestIntervalMilliseconds: 200,
  maximumUses: 250,
};

/** A deployment that configured a frontend API key, so the check is available. */
const CONFIGURATION_WITH_API_KEY = {
  backendBaseUrl: 'https://api.newtablinks.example',
  webClientDeviceName: 'NewTabLinks (production)',
  frontendApiKey: 'the-shared-frontend-key',
  usernameCheckDebounceMilliseconds: DEBOUNCE_MILLISECONDS,
  extensionDownload: { chromeWebStoreUrl: '', selfHostedCrxPath: '' },
};

/** The same deployment with no key configured, which is also what `ng serve` gets. */
const CONFIGURATION_WITHOUT_API_KEY = { ...CONFIGURATION_WITH_API_KEY, frontendApiKey: '' };

describe('RegisterPageViewModel username existence check', () => {
  let httpTestingController: HttpTestingController;

  /**
   * Builds the view-model against a given deployment configuration.
   *
   * @param runtimeConfiguration what config.json would have supplied
   * @returns the view-model under test
   */
  function createViewModel(runtimeConfiguration: unknown): RegisterPageViewModel {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: RUNTIME_CONFIGURATION, useValue: runtimeConfiguration },
        RegisterPageViewModel,
      ],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
    return TestBed.inject(RegisterPageViewModel);
  }

  /** Matches the lookup this feature makes, whatever its query string. */
  const isUsernameExistenceRequest = (url: string): boolean =>
    url.endsWith('/api/v1/auth/username-existence');

  /**
   * Answers the request for a metered pass, then waits out the delay before its first use.
   *
   * <p>Every lookup now begins with this: the endpoint is metered, so the site obtains a pass
   * and holds it for the interval the backend asked for before spending it. Serving the wait
   * here rather than being refused for it is deliberate — see {@code VisitorTokenService}.</p>
   */
  function issueTheVisitorTokenAndWaitForItsTurn(): void {
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/visitor-token'))
      .flush(AN_ISSUED_VISITOR_TOKEN);
    vi.advanceTimersByTime(FIRST_USE_DELAY_MILLISECONDS);
  }

  beforeEach(() => vi.useFakeTimers());

  afterEach(() => {
    vi.useRealTimers();
    httpTestingController.verify();
  });

  it('asks the backend once after typing stops, not once per keystroke', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    for (const partiallyTypedName of ['ali', 'alic', 'alice']) {
      viewModel.registrationForm.controls.username.setValue(partiallyTypedName);
      vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS - 50);
    }
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);
    issueTheVisitorTokenAndWaitForItsTurn();

    const sentRequest = httpTestingController.expectOne((request) =>
      isUsernameExistenceRequest(request.url),
    );
    expect(sentRequest.request.params.get('username')).toBe('alice');
    sentRequest.flush({ exists: false });
  });

  it('presents the shared frontend API key, which is what admits it to the endpoint', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);
    issueTheVisitorTokenAndWaitForItsTurn();

    const sentRequest = httpTestingController.expectOne((request) =>
      isUsernameExistenceRequest(request.url),
    );
    expect(sentRequest.request.headers.get('X-Frontend-Api-Key')).toBe('the-shared-frontend-key');
    expect(sentRequest.request.headers.get('X-Visitor-Token')).toBe(AN_ISSUED_VISITOR_TOKEN.token);
    sentRequest.flush({ exists: false });
  });

  it('refuses a repeated password that does not match the chosen one', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);
    const { password, passwordConfirmation } = viewModel.registrationForm.controls;

    password.setValue('a long passphrase');
    passwordConfirmation.setValue('a long passphrasf');
    passwordConfirmation.markAsTouched();

    expect(passwordConfirmation.hasError('passwordMismatch')).toBe(true);
    expect(viewModel.fieldValidationMessages()['passwordConfirmation']).not.toBe('');
    expect(viewModel.registrationForm.valid).toBe(false);
  });

  it('accepts a repeated password that matches', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);
    const { password, passwordConfirmation } = viewModel.registrationForm.controls;

    password.setValue('a long passphrase');
    passwordConfirmation.setValue('a long passphrase');
    passwordConfirmation.markAsTouched();

    expect(passwordConfirmation.valid).toBe(true);
    expect(viewModel.fieldValidationMessages()['passwordConfirmation']).toBe('');
  });

  it('re-judges the repeat field when the password above it is edited afterwards', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);
    const { password, passwordConfirmation } = viewModel.registrationForm.controls;

    password.setValue('a long passphrase');
    passwordConfirmation.setValue('a long passphrase');
    passwordConfirmation.markAsTouched();
    expect(passwordConfirmation.valid).toBe(true);

    // Angular only re-validates the control that changed, so without the view-model's own
    // subscription the repeat field would go on claiming the two still agree.
    password.setValue('a different passphrase');

    expect(passwordConfirmation.hasError('passwordMismatch')).toBe(true);
  });

  it('warns that a username is taken, and says nothing about it being free', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);
    issueTheVisitorTokenAndWaitForItsTurn();
    httpTestingController
      .expectOne((request) => isUsernameExistenceRequest(request.url))
      .flush({ exists: true });

    expect(viewModel.usernameTakenMessage()).not.toBe('');
    expect(viewModel.usernameAvailableMessage()).toBe('');
    expect(viewModel.isCheckingUsernameExistence()).toBe(false);
  });

  it('reports a free username', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);
    issueTheVisitorTokenAndWaitForItsTurn();
    httpTestingController
      .expectOne((request) => isUsernameExistenceRequest(request.url))
      .flush({ exists: false });

    expect(viewModel.usernameAvailableMessage()).not.toBe('');
    expect(viewModel.usernameTakenMessage()).toBe('');
  });

  it('says it is checking while the answer is outstanding', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);

    expect(viewModel.isCheckingUsernameExistence()).toBe(true);

    issueTheVisitorTokenAndWaitForItsTurn();
    httpTestingController
      .expectOne((request) => isUsernameExistenceRequest(request.url))
      .flush({ exists: false });
  });

  it('does not ask about a value the form already knows cannot be a username', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('a!');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);

    expect(viewModel.isCheckingUsernameExistence()).toBe(false);
  });

  it('never asks when the deployment configured no API key', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);

    expect(viewModel.isCheckingUsernameExistence()).toBe(false);
  });

  it('stays silent when the check is refused, so it cannot stop anyone registering', () => {
    const viewModel = createViewModel(CONFIGURATION_WITH_API_KEY);

    viewModel.registrationForm.controls.username.setValue('alice');
    vi.advanceTimersByTime(DEBOUNCE_MILLISECONDS);
    issueTheVisitorTokenAndWaitForItsTurn();
    httpTestingController
      .expectOne((request) => isUsernameExistenceRequest(request.url))
      .flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(viewModel.usernameTakenMessage()).toBe('');
    expect(viewModel.usernameAvailableMessage()).toBe('');
    expect(viewModel.isCheckingUsernameExistence()).toBe(false);
    expect(viewModel.registrationForm.controls.username.valid).toBe(true);
  });
});
