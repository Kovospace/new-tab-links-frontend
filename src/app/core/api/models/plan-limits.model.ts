/**
 * How many of each counted thing a plan allows, mirroring the backend's {@code PlanLimitsDto}.
 *
 * <p>The field names are the backend's and must not drift: they are also the names the Fair Use
 * placeholders in the markdown documents are built from ({@code {fairUseClosedTabs}}).</p>
 */
export interface PlanLimits {
  readonly profiles: number;
  readonly workspacesPerProfile: number;
  readonly groupsPerWorkspace: number;
  readonly subgroupsPerGroup: number;
  readonly linksPerWorkspace: number;
  readonly closedTabs: number;
  readonly browsingHistory: number;
  readonly devices: number;
}

/** One of the eight limits, by its backend name. */
export type PlanLimitName = keyof PlanLimits;

/** Every limit, in the order the admin pages and the Fair Use Policy list them. */
export const PLAN_LIMIT_NAMES: readonly PlanLimitName[] = [
  'profiles',
  'workspacesPerProfile',
  'groupsPerWorkspace',
  'subgroupsPerGroup',
  'linksPerWorkspace',
  'closedTabs',
  'browsingHistory',
  'devices',
];

/**
 * Both plans' limits as the backend publishes them, mirroring {@code GET /api/v1/plan-limits}.
 *
 * <p>{@code fairUse} is what premium promises as "unlimited" and what groups, subgroups and links
 * are held to on every plan.</p>
 */
export interface PublishedPlanLimits {
  readonly free: PlanLimits;
  readonly fairUse: PlanLimits;
}

/**
 * One account's raised limits: a number where the operator raised one, {@code null} where the
 * account follows the global Fair Use value.
 */
export type FairUseLimitOverrides = { readonly [name in PlanLimitName]: number | null };

/**
 * One account's Fair Use limits as the operator sees them, mirroring the backend's answer to
 * {@code GET /api/v1/admin/users/{userId}/fair-use-limits}.
 */
export interface UserFairUseLimits {
  /** What the operator raised, field by field; {@code null} inherits the global value. */
  readonly overrides: FairUseLimitOverrides;
  /** Why the limits were raised, or {@code null} when nobody wrote it down. */
  readonly note: string | null;
  /** The global Fair Use values every account starts from. */
  readonly fairUse: PlanLimits;
  /** What the account is actually held to: the override where there is one, else the global. */
  readonly effective: PlanLimits;
  /** Whether the account holds premium, without which the Fair Use limits do not reach it. */
  readonly premium: boolean;
}

/** What {@code PUT /api/v1/admin/users/{userId}/fair-use-limits} takes. */
export interface UserFairUseLimitsUpdate {
  readonly overrides: FairUseLimitOverrides;
  readonly note: string | null;
}
