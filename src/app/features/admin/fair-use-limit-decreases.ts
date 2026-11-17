import {
  PLAN_LIMIT_NAMES,
  PlanLimitName,
  PlanLimits,
} from '../../core/api/models/plan-limits.model';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * What lowering one limit does to accounts already above it, by limit.
 *
 * <ul>
 *   <li>The two histories are logs the extension trims to the cap on its next synchronisation,
 *   and the trimmed entries are gone from the account as well — nothing brings them back.</li>
 *   <li>Profiles, spaces and installations over the cap are kept on the device and simply stop
 *   synchronising.</li>
 *   <li>A space holding more groups, subgroups or links than the cap stops synchronising as a
 *   whole; nothing in it is deleted.</li>
 * </ul>
 */
const DECREASE_CONSEQUENCE_KEYS: Readonly<Record<PlanLimitName, string>> = {
  profiles: 'admin.fairUseDecrease.consequence.stopsSynchronising',
  workspacesPerProfile: 'admin.fairUseDecrease.consequence.stopsSynchronising',
  devices: 'admin.fairUseDecrease.consequence.stopsSynchronising',
  groupsPerWorkspace: 'admin.fairUseDecrease.consequence.spaceStopsSynchronising',
  subgroupsPerGroup: 'admin.fairUseDecrease.consequence.spaceStopsSynchronising',
  linksPerWorkspace: 'admin.fairUseDecrease.consequence.spaceStopsSynchronising',
  closedTabs: 'admin.fairUseDecrease.consequence.entriesDeleted',
  browsingHistory: 'admin.fairUseDecrease.consequence.entriesDeleted',
};

/** One limit that is about to go down, worded for the confirmation. */
export interface PresentedLimitDecrease {
  /** The limit's backend name. */
  readonly limitName: PlanLimitName;
  /** Such as "Closed tabs history: 500 → 300". */
  readonly change: string;
  /** What happens to accounts above the new value. */
  readonly consequence: string;
  /** Whether the consequence deletes data that cannot be restored. */
  readonly deletesData: boolean;
}

/**
 * Lists every limit that a change lowers, worded for the operator to confirm.
 *
 * @param currentLimits the limits in force now
 * @param intendedLimits the limits after the change
 * @param translationService source of the wording
 * @returns one entry per lowered limit, in the usual order; empty when nothing goes down
 */
export function describeLimitDecreases(
  currentLimits: PlanLimits,
  intendedLimits: PlanLimits,
  translationService: TranslationService,
): readonly PresentedLimitDecrease[] {
  return PLAN_LIMIT_NAMES.filter(
    (limitName) => intendedLimits[limitName] < currentLimits[limitName],
  ).map((limitName) => ({
    limitName,
    change: translationService.translate('admin.fairUseDecrease.change', {
      limit: translationService.translate(`admin.fairUseLimit.${limitName}`),
      from: String(currentLimits[limitName]),
      to: String(intendedLimits[limitName]),
    }),
    consequence: translationService.translate(DECREASE_CONSEQUENCE_KEYS[limitName]),
    deletesData: limitName === 'closedTabs' || limitName === 'browsingHistory',
  }));
}
