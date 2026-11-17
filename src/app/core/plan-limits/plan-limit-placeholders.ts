import { PLAN_LIMIT_NAMES, PlanLimitName, PlanLimits } from '../api/models/plan-limits.model';

/** What every Fair Use placeholder starts with: {@code {fairUseClosedTabs}}. */
const FAIR_USE_PLACEHOLDER_PREFIX = 'fairUse';

/**
 * Builds the name of the placeholder that stands for one Fair Use limit in a markdown document.
 *
 * @param limitName the limit, by its backend name
 * @returns such as {@code fairUseClosedTabs} for {@code closedTabs}
 */
export function fairUsePlaceholderName(limitName: PlanLimitName): string {
  return FAIR_USE_PLACEHOLDER_PREFIX + limitName.charAt(0).toUpperCase() + limitName.slice(1);
}

/**
 * Lists the Fair Use placeholders and the number each stands for.
 *
 * @param fairUseLimits the Fair Use limits in force
 * @returns placeholder name to number, written out as text
 */
export function fairUsePlaceholderValues(
  fairUseLimits: PlanLimits,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    PLAN_LIMIT_NAMES.map((limitName) => [
      fairUsePlaceholderName(limitName),
      String(fairUseLimits[limitName]),
    ]),
  );
}

/**
 * Replaces every Fair Use placeholder in a markdown document with the number in force.
 *
 * <p>Used by the tips, which carry no other placeholders; the legal documents fill these together
 * with the operator's details. Anything else in braces is left as written.</p>
 *
 * @param markdown the document as written
 * @param fairUseLimits the Fair Use limits in force
 * @returns the document with the numbers in place
 */
export function fillFairUsePlaceholders(markdown: string, fairUseLimits: PlanLimits): string {
  const values = fairUsePlaceholderValues(fairUseLimits);
  return markdown.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}
