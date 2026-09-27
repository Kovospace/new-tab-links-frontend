import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
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

/** Somewhere for the router to actually navigate to, so a real NavigationEnd is emitted. */
@Component({ template: '' })
class ArbitraryRoutedPage {}

describe('PageHeaderViewModel', () => {
  let viewModel: PageHeaderViewModel;
  let sessionStore: AuthenticationSessionStore;

  beforeEach(() => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'somewhere-else', component: ArbitraryRoutedPage }]),
        PageHeaderViewModel,
      ],
    });

    viewModel = TestBed.inject(PageHeaderViewModel);
    sessionStore = TestBed.inject(AuthenticationSessionStore);
  });

  it('offers an anonymous visitor the ways in', () => {
    const offeredLabels = viewModel.navigationEntries().map((entry) => entry.labelTranslationKey);

    expect(offeredLabels).toEqual([
      'nav.home',
      'nav.download',
      'nav.tips',
      'nav.register',
      'nav.login',
    ]);
  });

  it('marks Home current on its own page only, and every other entry on the pages below it too', () => {
    const pathMatching = Object.fromEntries(
      viewModel
        .navigationEntries()
        .map((entry) => [entry.labelTranslationKey, entry.activeWhen.paths]),
    );

    expect(pathMatching).toEqual({
      'nav.home': 'exact',
      'nav.download': 'subset',
      'nav.tips': 'subset',
      'nav.register': 'subset',
      'nav.login': 'subset',
    });
    for (const entry of viewModel.navigationEntries()) {
      expect(entry.activeWhen.queryParams).toBe('ignored');
    }
  });

  it('offers a signed-in visitor the pages that need a session', () => {
    sessionStore.startSession(ISSUED_TOKEN_PAIR);

    const offeredLabels = viewModel.navigationEntries().map((entry) => entry.labelTranslationKey);

    expect(offeredLabels).toEqual([
      'nav.home',
      'nav.download',
      'nav.tips',
      'nav.devices',
      'nav.account',
    ]);
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
      premium: false,
      createdAt: '2026-08-24T10:15:30Z',
      updatedAt: '2026-08-24T10:15:30Z',
    });

    expect(viewModel.signedInUserLabel()).toBe('Matej');
  });

  it('starts with the narrow-screen menu closed', () => {
    expect(viewModel.isMobileMenuOpen()).toBe(false);
  });

  it('opens and closes the narrow-screen menu on each press of the button', () => {
    viewModel.toggleMobileMenu();
    expect(viewModel.isMobileMenuOpen()).toBe(true);

    viewModel.toggleMobileMenu();
    expect(viewModel.isMobileMenuOpen()).toBe(false);
  });

  it('names the button after what pressing it will do', () => {
    expect(viewModel.mobileMenuToggleLabel()).toBe('nav.openMenu');

    viewModel.toggleMobileMenu();

    expect(viewModel.mobileMenuToggleLabel()).toBe('nav.closeMenu');
  });

  it('closes the menu once a navigation completes, so it cannot cover the new page', async () => {
    viewModel.toggleMobileMenu();
    expect(viewModel.isMobileMenuOpen()).toBe(true);

    await TestBed.inject(Router).navigate(['/somewhere-else']);

    expect(viewModel.isMobileMenuOpen()).toBe(false);
  });
});
