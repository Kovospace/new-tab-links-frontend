/**
 * Whether one profile or workspace of an installation synchronises, and if not, why.
 *
 * <p>Decided by the extension, which is the only side that sees data it does not push; the
 * backend stores the report as it arrives.</p>
 *
 * <ul>
 *   <li>{@code SYNCHRONISED} — it holds a slot and synchronises.</li>
 *   <li>{@code LOCAL_ONLY_FREE_LIMIT} — no slot was left for it on the account's plan.</li>
 *   <li>{@code LOCAL_ONLY_FAIR_USE} — it is over a Fair Use cap, so it stays on the device.</li>
 *   <li>{@code EXAMPLE} — untouched example data, which never synchronises.</li>
 * </ul>
 *
 * <p><strong>An open set</strong>, like every state the backend names: a value this build does not
 * know must still render, as "unknown", never as a blank cell.</p>
 */
export type InventorySyncState =
  | 'SYNCHRONISED'
  | 'LOCAL_ONLY_FREE_LIMIT'
  | 'LOCAL_ONLY_FAIR_USE'
  | 'EXAMPLE';

/** One workspace of an installation, as the installation reported it. */
export interface InventoryWorkspace {
  /** The account's identifier for it, or {@code null} when it has never synchronised. */
  readonly accountId: string | null;
  /** Its name on that installation. */
  readonly name: string;
  /** Whether it synchronises. */
  readonly syncState: InventorySyncState;
  /** How many groups it holds. */
  readonly groupCount: number;
  /** How many subgroups it holds, across its groups. */
  readonly subgroupCount: number;
  /** How many links it holds, across its groups and subgroups. */
  readonly linkCount: number;
}

/** One profile of an installation, as the installation reported it. */
export interface InventoryProfile {
  /** The account's identifier for it, or {@code null} when it has never synchronised. */
  readonly accountId: string | null;
  /** Its name on that installation. */
  readonly name: string;
  /** Whether it synchronises. */
  readonly syncState: InventorySyncState;
  /** Its workspaces, in the installation's order. */
  readonly workspaces: readonly InventoryWorkspace[];
}

/**
 * What one installation holds, mirroring the response of
 * {@code GET /api/v1/users/me/devices/{deviceId}/inventory}.
 *
 * <p>Names and counts only — never a link, an address or a group name. It exists so that a user
 * over a limit can see which data stays on which device, which the account could not otherwise
 * know: data that does not synchronise never reaches the server.</p>
 */
export interface DeviceInventory {
  /** When the installation sent this report, ISO-8601. */
  readonly reportedAt: string;
  /** The installation's profiles, in its own order. */
  readonly profiles: readonly InventoryProfile[];
}
