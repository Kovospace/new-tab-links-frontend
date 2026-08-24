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
}
