import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthenticationSessionStore } from '../../../core/auth/authentication-session.store';
import { TokenPair } from '../../../core/api/models/token-pair.model';
import { PageHeaderViewModel } from './page-header.view-model';

/** A token pair shaped like the real thing; only the fields the store reads matter here. */
const ISSUED_TOKEN_PAIR: TokenPair = {
  accessToken: 'access-token',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'refresh-token',
  userId: '11111111-1111-1111-1111-111111111111',
  username: 'kovo',
};

describe('PageHeaderViewModel', () => {
  let viewModel: PageHeaderViewModel;
  let sessionStore: AuthenticationSessionStore;

  beforeEach(() => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        PageHeaderViewModel,
      ],
    });

    viewModel = TestBed.inject(PageHeaderViewModel);
    sessionStore = TestBed.inject(AuthenticationSessionStore);
  });

  it('offers an anonymous visitor the ways in', () => {
    const offeredLabels = viewModel.navigationEntries().map((entry) => entry.labelTranslationKey);

    expect(offeredLabels).toEqual(['nav.home', 'nav.download', 'nav.register', 'nav.login']);
  });

  it('offers a signed-in visitor the pages that need a session', () => {
    sessionStore.startSession(ISSUED_TOKEN_PAIR);

    const offeredLabels = viewModel.navigationEntries().map((entry) => entry.labelTranslationKey);

    expect(offeredLabels).toEqual(['nav.home', 'nav.download', 'nav.devices', 'nav.account']);
  });

  it('greets by username until the account is loaded, then by display name', () => {
    sessionStore.startSession(ISSUED_TOKEN_PAIR);
    expect(viewModel.signedInUserLabel()).toBe('kovo');

    sessionStore.setSignedInAccount({
      id: ISSUED_TOKEN_PAIR.userId,
      username: 'kovo',
      email: 'someone@example.com',
      displayName: 'Matej',
      status: 'ACTIVE',
      hasPassword: true,
      createdAt: '2026-08-24T10:15:30Z',
      updatedAt: '2026-08-24T10:15:30Z',
    });

    expect(viewModel.signedInUserLabel()).toBe('Matej');
  });
});
