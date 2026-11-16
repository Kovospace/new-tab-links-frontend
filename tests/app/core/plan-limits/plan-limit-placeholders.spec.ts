import { describe, expect, it } from 'vitest';
import { COMPILED_PLAN_LIMITS } from '@app/core/plan-limits/compiled-plan-limits';
import {
  fairUsePlaceholderName,
  fillFairUsePlaceholders,
} from '@app/core/plan-limits/plan-limit-placeholders';

/** The Fair Use numbers written into markdown by name, so a document never states a stale one. */
describe('Fair Use placeholders', () => {
  it('names each placeholder after the backend field', () => {
    expect(fairUsePlaceholderName('linksPerWorkspace')).toBe('fairUseLinksPerWorkspace');
  });

  it('fills every Fair Use placeholder with the number in force', () => {
    const filled = fillFairUsePlaceholders(
      '{fairUseClosedTabs} tabs, {fairUseBrowsingHistory} pages, {fairUseDevices} devices',
      { ...COMPILED_PLAN_LIMITS.fairUse, closedTabs: 800 },
    );

    expect(filled).toBe('800 tabs, 1000 pages, 100 devices');
  });

  it('leaves anything else in braces as written', () => {
    expect(
      fillFairUsePlaceholders('{fairUseClosedTab} {other}', COMPILED_PLAN_LIMITS.fairUse),
    ).toBe('{fairUseClosedTab} {other}');
  });
});
