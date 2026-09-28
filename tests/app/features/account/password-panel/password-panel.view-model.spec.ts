import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PasswordPanelViewModel } from '@app/features/account/password-panel/password-panel.view-model';

/** Long enough to satisfy the backend's ten-character minimum. */
const ACCEPTABLE_PASSWORD = 'a long passphrase is best';

describe('PasswordPanelViewModel', () => {
  let viewModel: PasswordPanelViewModel;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PasswordPanelViewModel],
    });

    viewModel = TestBed.inject(PasswordPanelViewModel);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTestingController.verify());

  it('omits the current password entirely for an account created through Google', () => {
    viewModel.configureForAccount(false);
    viewModel.passwordForm.setValue({ currentPassword: '', newPassword: ACCEPTABLE_PASSWORD });

    viewModel.submitPasswordChange();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/password/change'),
    );
    expect(sentRequest.request.body).toEqual({ newPassword: ACCEPTABLE_PASSWORD });
    sentRequest.flush(null);
  });

  it('sends the current password when the account already has one', () => {
    viewModel.configureForAccount(true);
    viewModel.passwordForm.setValue({
      currentPassword: 'the old passphrase',
      newPassword: ACCEPTABLE_PASSWORD,
    });

    viewModel.submitPasswordChange();

    const sentRequest = httpTestingController.expectOne((request) =>
      request.url.endsWith('/api/v1/auth/password/change'),
    );
    expect(sentRequest.request.body).toEqual({
      currentPassword: 'the old passphrase',
      newPassword: ACCEPTABLE_PASSWORD,
    });
    sentRequest.flush(null);
  });

  it('refuses to send when an account with a password leaves the current one blank', () => {
    viewModel.configureForAccount(true);
    viewModel.passwordForm.setValue({ currentPassword: '', newPassword: ACCEPTABLE_PASSWORD });

    viewModel.submitPasswordChange();

    httpTestingController.verify();
    expect(viewModel.passwordForm.invalid).toBe(true);
  });

  it('accepts a blank current password when the account has none', () => {
    viewModel.configureForAccount(false);
    viewModel.passwordForm.setValue({ currentPassword: '', newPassword: ACCEPTABLE_PASSWORD });

    expect(viewModel.passwordForm.valid).toBe(true);
  });

  it('refuses a new password shorter than the backend accepts', () => {
    viewModel.configureForAccount(false);
    viewModel.passwordForm.setValue({ currentPassword: '', newPassword: 'too short' });

    viewModel.submitPasswordChange();

    httpTestingController.verify();
    expect(viewModel.passwordForm.controls.newPassword.invalid).toBe(true);
  });
});
