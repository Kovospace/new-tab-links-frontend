import { PublishedPlanLimits } from '../api/models/plan-limits.model';
import compiledPlanLimits from './compiled-plan-limits.json';

/**
 * The plan limits as they stood when the site was built: what every pre-rendered page shows, and
 * what a browser keeps showing when the backend cannot be asked.
 *
 * <p>JSON rather than a TypeScript constant so that {@code scripts/build-tips-index.mjs} can fill
 * the same numbers into the tips' searchable text — Node cannot import this file, but it can read
 * that one. They must match the backend's defaults; the backend is what enforces them, these are
 * only what is printed until it has answered.</p>
 */
export const COMPILED_PLAN_LIMITS: PublishedPlanLimits = compiledPlanLimits;
