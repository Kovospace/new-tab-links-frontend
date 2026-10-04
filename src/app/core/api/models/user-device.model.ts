/**
 * How much of an installation synchronises, summed up from the inventory it last reported.
 *
 * <p>Computed by the backend: {@code SYNCHRONISED} when everything it holds synchronises,
 * {@code PARTIAL} when some of it stays on the device, {@code NOT_SYNCHRONISED} when none of it
 * reaches the account, and {@code UNKNOWN} when it has never reported — which includes the
 * website's own sign-ins, since a browser tab holds no data to report. Example data is left out of
 * the sum. An open set: an unknown value renders as {@code UNKNOWN} does.</p>
 */
export type DeviceSyncSummary = 'SYNCHRONISED' | 'PARTIAL' | 'NOT_SYNCHRONISED' | 'UNKNOWN';

/**
 * A browser the account has been signed in from.
 *
 * <p>Mirrors {@code UserDeviceDto}. A device is the pair {@code (deviceName, browserName)}
 * within one account, so one machine running three browsers is three devices — which is what
 * the user experiences, since each browser holds its own tokens.</p>
 *
 * <p>This is a <em>history</em>, not a list of live sessions: a device stays listed after its
 * tokens are revoked, and {@link signedIn} is what says whether it still holds a usable
 * session.</p>
 */
export interface UserDevice {
  /** Identifier of the device, used to sign it out. */
  readonly id: string;
  /** Name of the machine as the client reported it; never verified by the backend. */
  readonly deviceName: string;
  /** Browser on that machine, parsed from the user agent. */
  readonly browserName: string;
  /** When the account was first used from here, ISO-8601. */
  readonly firstSeenAt: string;
  /** When the account was last used from here, ISO-8601. */
  readonly lastUsedAt: string;
  /** Whether this device still holds a usable session. */
  readonly signedIn: boolean;
  /** How much of what it holds synchronises. */
  readonly syncSummary: DeviceSyncSummary;
  /** When it last reported what it holds, ISO-8601, or {@code null} when it never has. */
  readonly inventoryReportedAt: string | null;
}
