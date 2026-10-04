import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthenticationService } from '@app/core/admin/admin-authentication.service';
import { AdminSessionStore } from '@app/core/admin/admin-session.store';
import { AdminUserService } from '@app/core/admin/admin-user.service';
import { AdminPremiumSource, AdminUser } from '@app/core/api/models/admin.model';
import { AdminUsersPageViewModel } from '@app/features/admin/admin-users-page.view-model';

/**
 * How the account list words premium, and when the edit panel lets the operator change it.
 */
describe('AdminUsersPageViewModel premium', () => {
  let viewModel: AdminUsersPageViewModel;
  let updateAccount: ReturnType<typeof vi.fn>;

  const account = (
    id: string,
    premiumSource: AdminPremiumSource | null,
    premiumUntil: string | null = null,
  ): AdminUser => ({
    id,
    username: id,
    email: `${id}@example.com`,
    displayName: id,
    status: 'ACTIVE',
    hasPassword: true,
    premium: premiumSource !== null,
    premiumSource,
    premiumUntil,
    failedLoginAttempts: 0,
    createdAt: '2026-09-27T10:00:00Z',
    updatedAt: '2026-09-27T10:00:00Z',
  });

  const accounts = [
    account('free', null),
    account('lifetime', 'LIFETIME'),
    account('subscriber', 'SUBSCRIPTION', '2027-01-01T00:00:00Z'),
    account('granted', 'GRANT'),
    account('granted-year', 'GRANT', '2027-10-04T10:00:00Z'),
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
              of({ users: accounts, page: 0, size: 20, totalUsers: 5, totalPages: 1 }),
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
      'admin.premium.GRANT_UNTIL',
    ]);
  });

  it('offers no grant to an account that paid, and sends it unchanged', () => {
    viewModel.editAccount('lifetime');

    expect(viewModel.editedAccountHasPaidPremium()).toBe(true);

    viewModel.saveEditedAccount();
    expect(updateAccount).toHaveBeenCalledWith(
      'lifetime',
      expect.objectContaining({ premium: true, premiumGrantTerm: null }),
    );
  });

  it('opens a grant at the length it was given', () => {
    viewModel.editAccount('granted');
    expect(viewModel.editForm.controls.premiumGrant.value).toBe('LIFETIME');

    viewModel.editAccount('granted-year');
    expect(viewModel.editForm.controls.premiumGrant.value).toBe('ONE_YEAR');

    viewModel.editAccount('free');
    expect(viewModel.editForm.controls.premiumGrant.value).toBe('NONE');
  });

  it('sends no term for an unchanged grant, so a save never extends it', () => {
    viewModel.editAccount('granted-year');
    viewModel.saveEditedAccount();

    expect(updateAccount).toHaveBeenCalledWith(
      'granted-year',
      expect.objectContaining({ premium: true, premiumGrantTerm: null }),
    );
  });

  it('sends the new term when the operator changes the grant', () => {
    viewModel.editAccount('granted-year');
    viewModel.editForm.controls.premiumGrant.setValue('LIFETIME');
    viewModel.saveEditedAccount();

    expect(updateAccount).toHaveBeenCalledWith(
      'granted-year',
      expect.objectContaining({ premium: true, premiumGrantTerm: 'LIFETIME' }),
    );
  });

  it('takes a grant back when the operator chooses none', () => {
    viewModel.editAccount('lifetime');
    viewModel.editAccount('granted');

    expect(viewModel.editedAccountHasPaidPremium()).toBe(false);

    viewModel.editForm.controls.premiumGrant.setValue('NONE');
    viewModel.saveEditedAccount();
    expect(updateAccount).toHaveBeenCalledWith(
      'granted',
      expect.objectContaining({ premium: false, premiumGrantTerm: null }),
    );
  });
});
