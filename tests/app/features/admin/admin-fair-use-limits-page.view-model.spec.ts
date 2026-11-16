import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFairUseLimitsService } from '@app/core/admin/admin-fair-use-limits.service';
import { BackendFailureTranslator } from '@app/core/api/backend-failure.translator';
import { PlanLimits } from '@app/core/api/models/plan-limits.model';
import { TranslationService } from '@app/core/i18n/translation.service';
import { AdminFairUseLimitsPageViewModel } from '@app/features/admin/admin-fair-use-limits-page.view-model';

const LIMITS_IN_FORCE: PlanLimits = {
  profiles: 50,
  workspacesPerProfile: 50,
  groupsPerWorkspace: 25,
  subgroupsPerGroup: 25,
  linksPerWorkspace: 500,
  closedTabs: 500,
  browsingHistory: 1000,
  devices: 100,
};

/**
 * The global Fair Use limits: a raise is saved at once, a decrease only after a confirmation that
 * says what it does — in so many words when it deletes history entries.
 */
describe('AdminFairUseLimitsPageViewModel', () => {
  let saveGlobalLimits: ReturnType<typeof vi.fn>;
  let viewModel: AdminFairUseLimitsPageViewModel;

  beforeEach(() => {
    saveGlobalLimits = vi.fn((limits: PlanLimits) => of(limits));
    TestBed.configureTestingModule({
      providers: [
        AdminFairUseLimitsPageViewModel,
        {
          provide: AdminFairUseLimitsService,
          useValue: { loadGlobalLimits: () => of(LIMITS_IN_FORCE), saveGlobalLimits },
        },
        {
          provide: BackendFailureTranslator,
          useValue: {
            describeFailure: () => 'It failed.',
            extractValidationMessages: () => ['closedTabs: must be at least 1'],
          },
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
    viewModel = TestBed.inject(AdminFairUseLimitsPageViewModel);
    viewModel.loadLimits();
  });

  it('fills the form with the limits in force', () => {
    expect(viewModel.hasLoadedLimits()).toBe(true);
    expect(viewModel.limitsForm.getRawValue()).toEqual(LIMITS_IN_FORCE);
  });

  it('saves a raise straight away, all eight values together', () => {
    viewModel.limitsForm.controls.linksPerWorkspace.setValue(800);
    viewModel.submitLimits();

    expect(viewModel.isConfirmingDecrease()).toBe(false);
    expect(saveGlobalLimits).toHaveBeenCalledWith({ ...LIMITS_IN_FORCE, linksPerWorkspace: 800 });
    expect(viewModel.submissionSuccess()).toBe('admin.fairUseLimits.saved');
  });

  it('holds a decrease for confirmation, naming the deletion it causes', () => {
    viewModel.limitsForm.controls.closedTabs.setValue(300);
    viewModel.limitsForm.controls.devices.setValue(200);
    viewModel.submitLimits();

    expect(saveGlobalLimits).not.toHaveBeenCalled();
    expect(viewModel.pendingDecreases().map((decrease) => decrease.consequence)).toEqual([
      'admin.fairUseDecrease.consequence.entriesDeleted',
    ]);
    expect(viewModel.decreaseDeletesData()).toBe(true);

    viewModel.confirmDecrease();
    expect(saveGlobalLimits).toHaveBeenCalledWith({
      ...LIMITS_IN_FORCE,
      closedTabs: 300,
      devices: 200,
    });
    expect(viewModel.isConfirmingDecrease()).toBe(false);
  });

  it('says that items stop synchronising when a profile or space limit goes down', () => {
    viewModel.limitsForm.controls.workspacesPerProfile.setValue(10);
    viewModel.limitsForm.controls.linksPerWorkspace.setValue(100);
    viewModel.submitLimits();

    expect(viewModel.pendingDecreases().map((decrease) => decrease.consequence)).toEqual([
      'admin.fairUseDecrease.consequence.stopsSynchronising',
      'admin.fairUseDecrease.consequence.spaceStopsSynchronising',
    ]);
    expect(viewModel.decreaseDeletesData()).toBe(false);
  });

  it('sends nothing when the decrease is cancelled', () => {
    viewModel.limitsForm.controls.browsingHistory.setValue(10);
    viewModel.submitLimits();
    viewModel.cancelDecrease();

    expect(viewModel.isConfirmingDecrease()).toBe(false);
    expect(saveGlobalLimits).not.toHaveBeenCalled();
  });

  it('refuses an empty, fractional or zero value before asking the backend', () => {
    for (const invalid of [null, 2.5, 0]) {
      viewModel.limitsForm.controls.profiles.setValue(invalid);
      viewModel.submitLimits();
    }

    expect(saveGlobalLimits).not.toHaveBeenCalled();
    expect(viewModel.fieldValidationMessages()['profiles']).toBe('form.tooSmall {"min":1}');
  });

  it('shows the backend field errors when a save is refused', () => {
    saveGlobalLimits.mockReturnValue(throwError(() => new Error('400')));
    viewModel.limitsForm.controls.profiles.setValue(60);
    viewModel.submitLimits();

    expect(viewModel.submissionFailure()).toBe('It failed.');
    expect(viewModel.backendValidationMessages()).toEqual(['closedTabs: must be at least 1']);
  });
});
