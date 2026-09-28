import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthenticationService } from '@app/core/admin/admin-authentication.service';
import { AdminSessionStore } from '@app/core/admin/admin-session.store';
import { TranslationService } from '@app/core/i18n/translation.service';
import { AdminHeaderViewModel } from '@app/features/admin/admin-header/admin-header.view-model';

/**
 * The header every operator page shares: both pages linked, the one on screen marked, sign-out.
 */
describe('AdminHeaderViewModel', () => {
  let currentUrl: string;
  const signOut = vi.fn();
  const navigateByUrl = vi.fn(() => Promise.resolve(true));

  function createViewModel(): AdminHeaderViewModel {
    TestBed.configureTestingModule({
      providers: [
        AdminHeaderViewModel,
        { provide: AdminAuthenticationService, useValue: { signOut } },
        { provide: AdminSessionStore, useValue: { expiresAt: signal(null) } },
        {
          provide: TranslationService,
          useValue: { currentLanguageCode: signal('en'), translate: (key: string) => key },
        },
        {
          provide: Router,
          useValue: {
            get url() {
              return currentUrl;
            },
            navigateByUrl,
          },
        },
      ],
    });
    return TestBed.inject(AdminHeaderViewModel);
  }

  beforeEach(() => {
    signOut.mockClear();
    navigateByUrl.mockClear();
  });

  it('links both operator pages and marks the one on screen', () => {
    currentUrl = '/admin/metrics?month=2026-09';

    expect(createViewModel().presentedLinks()).toEqual([
      { routerLink: '/admin/users', label: 'admin.navigation.accounts', isCurrentPage: false },
      { routerLink: '/admin/metrics', label: 'admin.navigation.statistics', isCurrentPage: true },
    ]);
  });

  it('marks the accounts page when that is the one on screen', () => {
    currentUrl = '/admin/users';

    expect(
      createViewModel()
        .presentedLinks()
        .map((link) => link.isCurrentPage),
    ).toEqual([true, false]);
  });

  it('signs the operator out and returns to the sign-in', () => {
    currentUrl = '/admin/users';
    createViewModel().signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(navigateByUrl).toHaveBeenCalledWith('/admin');
  });
});
