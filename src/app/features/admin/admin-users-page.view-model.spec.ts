import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthenticationService } from '../../core/admin/admin-authentication.service';
import { AdminSessionStore } from '../../core/admin/admin-session.store';
import { AdminUserService } from '../../core/admin/admin-user.service';
import { AdminPremiumSource, AdminUser } from '../../core/api/models/admin.model';
import { AdminUsersPageViewModel } from './admin-users-page.view-model';

/**
 * How the account list words premium, and when the edit panel lets the operator change it.
 */
describe('AdminUsersPageViewModel premium', () => {
  let viewModel: AdminUsersPageViewModel;
  let updateAccount: ReturnType<typeof vi.fn>;

  const account = (id: string, premiumSource: AdminPremiumSource | null): AdminUser => ({
    id,
    username: id,
    email: `${id}@example.com`,
    displayName: id,
    status: 'ACTIVE',
    hasPassword: true,
    premium: premiumSource !== null,
    premiumSource,
    failedLoginAttempts: 0,
    createdAt: '2026-09-27T10:00:00Z',
    updatedAt: '2026-09-27T10:00:00Z',
  });

  const accounts = [
    account('free', null),
    account('lifetime', 'LIFETIME'),
    account('subscriber', 'SUBSCRIPTION'),
    account('granted', 'GRANT'),
  ];

  beforeEach(() => {
    updateAccount = vi.fn(() => of(accounts[0]));
    TestBed.configureTestingModule({
      providers: [
        AdminUsersPageViewModel,
        {
          provide: AdminUserService,
          useValue: {
            listAccounts: () =>
              of({ users: accounts, page: 0, size: 20, totalUsers: 4, totalPages: 1 }),
            updateAccount,
          },
        },
        { provide: AdminAuthenticationService, useValue: {} },
        { provide: AdminSessionStore, useValue: { expiresAt: signal(null) } },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      ],
    });
    viewModel = TestBed.inject(AdminUsersPageViewModel);
    viewModel.loadFirstPage();
  });

  it('says why each account is premium, and free where it is not', () => {
    expect(viewModel.accounts().map((presented) => presented.premiumLabel)).toEqual([
      'admin.premium.no',
      'admin.premium.LIFETIME',
      'admin.premium.SUBSCRIPTION',
      'admin.premium.GRANT',
    ]);
  });

  it('locks the premium box for an account that paid, and sends it unchanged', () => {
    viewModel.editAccount('lifetime');

    expect(viewModel.editedAccountHasPaidPremium()).toBe(true);
    expect(viewModel.editForm.controls.premium.disabled).toBe(true);

    viewModel.saveEditedAccount();
    expect(updateAccount).toHaveBeenCalledWith(
      'lifetime',
      expect.objectContaining({ premium: true }),
    );
  });

  it('leaves the box free for a granted or free account', () => {
    viewModel.editAccount('lifetime');
    viewModel.editAccount('granted');

    expect(viewModel.editedAccountHasPaidPremium()).toBe(false);
    expect(viewModel.editForm.controls.premium.enabled).toBe(true);

    viewModel.editForm.controls.premium.setValue(false);
    viewModel.saveEditedAccount();
    expect(updateAccount).toHaveBeenCalledWith(
      'granted',
      expect.objectContaining({ premium: false }),
    );
  });
});
