import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RegistrationAccepted } from '@app/core/api/models/registration.model';
import { RUNTIME_CONFIGURATION } from '@app/core/config/runtime-configuration';
import { RegisterPageViewModel } from '@app/features/register/register-page.view-model';

/** How long the view-model waits for typing to stop before it asks the backend. */
const DEBOUNCE_MILLISECONDS = 250;

/** How long the backend says a freshly issued pass must be held before its first use. */
const FIRST_USE_DELAY_MILLISECONDS = 500;

/** Shortest gap the backend says it allows between two calls made with the same pass. */
const REQUEST_INTERVAL_MILLISECONDS = 200;

/** A pass, as the backend issues it. */
const AN_ISSUED_VISITOR_TOKEN = {
  token: 'a-visitor-token',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  minimumFirstUseDelayMilliseconds: FIRST_USE_DELAY_MILLISECONDS,
  minimumRequestIntervalMilliseconds: REQUEST_INTERVAL_MILLISECONDS,
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

describe('RegisterPageViewModel username existence check', () => {
  /** Matches the lookup this feature makes, whatever its query string. */
  const isUsernameExistenceRequest = (url: string): boolean =>
    url.endsWith('/api/v1/auth/username-existence');

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

describe('RegisterPageViewModel activation email resend', () => {
  /** The backend's uniform acknowledgement, as it reads on a backend without the newer field. */
  const AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS: RegistrationAccepted = {
    message: 'If that address can receive mail, an activation link is on its way.',
  };

  /** Address the form is filled in with, and the one a resend must therefore go to. */
  const THE_REGISTERED_ADDRESS = 'alice+registration@example.test';

  /** Matches the resend this feature makes, whatever its query string. */
  const isResendActivationRequest = (url: string): boolean =>
    url.includes('/api/v1/auth/resend-activation');

  /**
   * Fills the form in with something the backend would accept.
   *
   * <p>These tests run against a deployment with no frontend API key on purpose: the username
   * lookup is then unavailable, so filling the username in cannot put a request of its own in
   * front of the one being examined.</p>
   *
   * @param viewModel the view-model under test
   */
  function fillInAValidRegistration(viewModel: RegisterPageViewModel): void {
    viewModel.registrationForm.setValue({
      username: 'alice',
      email: THE_REGISTERED_ADDRESS,
      displayName: 'Alice',
      password: 'a long passphrase',
      passwordConfirmation: 'a long passphrase',
    });
  }

  /**
   * Registers, and answers with the acknowledgement given.
   *
   * @param viewModel       the view-model under test
   * @param acknowledgement what the backend answers the registration with
   */
  function registerAndAnswerWith(
    viewModel: RegisterPageViewModel,
    acknowledgement: RegistrationAccepted,
  ): void {
    fillInAValidRegistration(viewModel);
    viewModel.submitRegistration();
    issueTheVisitorTokenAndWaitForItsTurn();
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/register'))
      .flush(acknowledgement);
  }

  it('offers nothing until a registration has been accepted', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    expect(viewModel.isResendOffered()).toBe(false);
    expect(viewModel.emailDeliveryWarning()).toBe('');
  });

  it('offers another activation link once a registration has been accepted', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS);

    expect(viewModel.isResendOffered()).toBe(true);
    expect(viewModel.submissionSuccess()).toBe(AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS.message);
  });

  it('sends the fresh link to the address the cleared form no longer holds', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS);
    expect(viewModel.registrationForm.controls.email.value).toBe('');

    viewModel.submitResendRequest();

    const sentRequest = httpTestingController.expectOne((request) =>
      isResendActivationRequest(request.url),
    );
    expect(decodeURIComponent(sentRequest.request.url)).toContain(THE_REGISTERED_ADDRESS);
    sentRequest.flush({ message: 'A new link is on its way.' });
    expect(viewModel.submissionSuccess()).toBe('A new link is on its way.');
  });

  it('reports nothing about delivery when the backend does not mention it', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS);

    expect(viewModel.emailDeliveryWarning()).toBe('');
  });

  it('reports nothing about delivery when the backend says the message got out', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: true,
    });

    expect(viewModel.emailDeliveryWarning()).toBe('');
  });

  it('reports nothing about delivery when the backend sends the field as null', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    // How every endpoint that does not report delivery answers: the backend field is a nullable
    // Boolean and no nulls are omitted, so the key is present and empty rather than missing. A
    // truthiness check instead of `=== false` would raise a false alarm on all of them.
    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: null,
    });

    expect(viewModel.emailDeliveryWarning()).toBe('');
  });

  it('hides the wait-for-it hint while warning that the message was never sent', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: false,
    });

    // Telling someone to wait for a message we know was never sent is worse than saying nothing.
    expect(viewModel.isResendHintShown()).toBe(false);
    // The resend control itself is exactly what they need here, so it stays.
    expect(viewModel.isResendOffered()).toBe(true);
  });

  it('keeps the wait-for-it hint when delivery is not in question', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: true,
    });

    expect(viewModel.isResendHintShown()).toBe(true);
  });

  it('warns when the backend says the message never reached the mail relay', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: false,
    });

    expect(viewModel.emailDeliveryWarning()).not.toBe('');
    // The warning is an addition, never a replacement: the backend's uniform wording is what
    // stops this page disclosing whether the address was already registered.
    expect(viewModel.submissionSuccess()).toBe(AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS.message);
    expect(viewModel.isResendOffered()).toBe(true);
  });

  it('drops the standing delivery warning once another link has been asked for', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: false,
    });
    viewModel.submitResendRequest();

    expect(viewModel.emailDeliveryWarning()).toBe('');

    httpTestingController
      .expectOne((request) => isResendActivationRequest(request.url))
      .flush({ message: 'A new link is on its way.' });
  });

  it('withdraws the offer while a further registration is in flight', () => {
    const viewModel = createViewModel(CONFIGURATION_WITHOUT_API_KEY);

    registerAndAnswerWith(viewModel, {
      ...AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS,
      emailDelivered: false,
    });

    fillInAValidRegistration(viewModel);
    viewModel.submitRegistration();

    expect(viewModel.isResendOffered()).toBe(false);
    expect(viewModel.emailDeliveryWarning()).toBe('');

    // The pass is already in hand by now, so only the interval between two calls is waited out.
    vi.advanceTimersByTime(REQUEST_INTERVAL_MILLISECONDS);
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/auth/register'))
      .flush(AN_ACKNOWLEDGEMENT_WITHOUT_DELIVERY_NEWS);

    expect(viewModel.isResendOffered()).toBe(true);
  });
});
