import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFairUseLimitsService } from '@app/core/admin/admin-fair-use-limits.service';
import { AdminUserService } from '@app/core/admin/admin-user.service';
import { BackendFailureTranslator } from '@app/core/api/backend-failure.translator';
import { AdminUser } from '@app/core/api/models/admin.model';
import {
  FairUseLimitOverrides,
  PlanLimits,
  UserFairUseLimits,
} from '@app/core/api/models/plan-limits.model';
import { TranslationService } from '@app/core/i18n/translation.service';
import { AdminUserDetailPageViewModel } from '@app/features/admin/admin-user-detail-page.view-model';

const GLOBAL_LIMITS: PlanLimits = {
  profiles: 50,
  workspacesPerProfile: 50,
  groupsPerWorkspace: 25,
  subgroupsPerGroup: 25,
  linksPerWorkspace: 500,
  closedTabs: 500,
  browsingHistory: 1000,
  devices: 100,
};

const NO_OVERRIDES: FairUseLimitOverrides = {
  profiles: null,
  workspacesPerProfile: null,
  groupsPerWorkspace: null,
  subgroupsPerGroup: null,
  linksPerWorkspace: null,
  closedTabs: null,
  browsingHistory: null,
  devices: null,
};

const ACCOUNT = {
  id: 'user-1',
  username: 'kovo',
  email: 'kovo@example.com',
  displayName: 'Kovo',
} as AdminUser;

/** The account's limits as the backend would hold them with these overrides. */
function userLimits(overrides: Partial<FairUseLimitOverrides>, premium = true): UserFairUseLimits {
  const allOverrides = { ...NO_OVERRIDES, ...overrides };
  const effective = Object.fromEntries(
    Object.entries(GLOBAL_LIMITS).map(([name, value]) => [
      name,
      allOverrides[name as keyof PlanLimits] ?? value,
    ]),
  ) as unknown as PlanLimits;
  return {
    overrides: allOverrides,
    note: 'support case',
    fairUse: GLOBAL_LIMITS,
    effective,
    premium,
  };
}

/**
 * One account's raised Fair Use limits: only raises are accepted, an empty field inherits, and
 * anything that lowers what the account is held to is confirmed first.
 */
describe('AdminUserDetailPageViewModel', () => {
  let loaded: UserFairUseLimits;
  let saveUserLimits: ReturnType<typeof vi.fn>;
  let removeUserLimits: ReturnType<typeof vi.fn>;
  let viewModel: AdminUserDetailPageViewModel;

  const createViewModel = (limits: UserFairUseLimits): void => {
    loaded = limits;
    viewModel = TestBed.inject(AdminUserDetailPageViewModel);
    viewModel.load();
  };

  beforeEach(() => {
    saveUserLimits = vi.fn((_userId: string, update: { overrides: FairUseLimitOverrides }) =>
      of(userLimits(update.overrides)),
    );
    removeUserLimits = vi.fn(() => {
      loaded = userLimits({});
      return of(undefined);
    });
    TestBed.configureTestingModule({
      providers: [
        AdminUserDetailPageViewModel,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ userId: 'user-1' }) } },
        },
        { provide: AdminUserService, useValue: { loadAccount: () => of(ACCOUNT) } },
        {
          provide: AdminFairUseLimitsService,
          useValue: { loadUserLimits: () => of(loaded), saveUserLimits, removeUserLimits },
        },
        {
          provide: BackendFailureTranslator,
          useValue: { describeFailure: () => 'It failed.', extractValidationMessages: () => [] },
        },
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode: signal('en'),
            translate: (key: string, values?: Record<string, string>) =>
              values ? `${key} ${JSON.stringify(values)}` : key,
          },
        },
      ],
    });
  });

  it('shows global, override and effective per limit, with the override as typed', () => {
    createViewModel(userLimits({ linksPerWorkspace: 2000 }));

    const linksRow = viewModel.limitRows().find((row) => row.limitName === 'linksPerWorkspace');
    expect(linksRow).toMatchObject({ globalValue: '500', minimum: 500, effectiveValue: '2000' });
    expect(viewModel.limitsForm.controls.linksPerWorkspace.value).toBe(2000);
    expect(viewModel.limitsForm.controls.closedTabs.value).toBeNull();
    expect(viewModel.limitsForm.controls.note.value).toBe('support case');
    expect(viewModel.hasOverrides()).toBe(true);
  });

  it('refuses an override below the global value', () => {
    createViewModel(userLimits({}));
    viewModel.limitsForm.controls.closedTabs.setValue(400);
    viewModel.submitOverrides();

    expect(saveUserLimits).not.toHaveBeenCalled();
    expect(viewModel.fieldValidationMessages()['closedTabs']).toBe('form.tooSmall {"min":500}');
  });

  it('saves a raise at once, sending empty fields as null and a blank note as null', () => {
    createViewModel(userLimits({}));
    viewModel.limitsForm.controls.devices.setValue(150);
    viewModel.limitsForm.controls.note.setValue('   ');
    viewModel.submitOverrides();

    expect(saveUserLimits).toHaveBeenCalledWith('user-1', {
      overrides: { ...NO_OVERRIDES, devices: 150 },
      note: null,
    });
    expect(viewModel.submissionSuccess()).toBe('admin.userDetail.saved');
  });

  it('confirms before emptying an override that lowers a history', () => {
    createViewModel(userLimits({ browsingHistory: 5000 }));
    viewModel.limitsForm.controls.browsingHistory.setValue(null);
    viewModel.submitOverrides();

    expect(saveUserLimits).not.toHaveBeenCalled();
    expect(viewModel.decreaseDeletesData()).toBe(true);

    viewModel.confirmDecrease();
    expect(saveUserLimits).toHaveBeenCalledWith('user-1', {
      overrides: NO_OVERRIDES,
      note: 'support case',
    });
  });

  it('confirms before removing every override, then reads back the global limits', () => {
    createViewModel(userLimits({ profiles: 80 }));
    viewModel.removeOverrides();

    expect(removeUserLimits).not.toHaveBeenCalled();
    expect(viewModel.pendingDecreases().map((decrease) => decrease.limitName)).toEqual([
      'profiles',
    ]);

    viewModel.confirmDecrease();
    expect(removeUserLimits).toHaveBeenCalledWith('user-1');
    expect(viewModel.hasOverrides()).toBe(false);
    expect(viewModel.submissionSuccess()).toBe('admin.userDetail.removed');
  });

  it('warns that a free account keeps its free plan limits', () => {
    createViewModel(userLimits({}, false));

    expect(viewModel.freePlanNotice()).toBe('admin.userDetail.freePlanNotice');
  });
});
