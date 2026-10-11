/**
 * What the comparison page says about Tabilinks and the extensions it is compared with.
 *
 * <p>Facts only, and each of them checkable on the extension's store page or in the extension
 * itself: comparative advertising is lawful in the EU only while it compares verifiable features
 * and never disparages a competitor. That is why nothing here holds an opinion, and why user
 * counts, which change weekly, are not compared at all. A finding nobody could confirm is
 * {@code unknown} and shown as "not found", never as "no".</p>
 *
 * <p>Language-neutral: every word is a translation key under {@code comparison.*}, and prices are
 * amounts the page formats in the reader's language. Edit this file when a competitor changes,
 * and move {@link COMPARISON_CHECKED_ON} with it — an out-of-date comparison is a misleading one.</p>
 */

/** How far an extension offers a feature. */
export type FeatureSupport = 'yes' | 'no' | 'partial' | 'unknown';

/** The features compared, one column each. */
export type ComparedFeature =
  'profiles' | 'workspaces' | 'groups' | 'subgroups' | 'synchronisation' | 'offlineUse';

/** The feature columns, in the order the table shows them. */
export const COMPARED_FEATURES: readonly ComparedFeature[] = [
  'profiles',
  'workspaces',
  'groups',
  'subgroups',
  'synchronisation',
  'offlineUse',
];

/** One extension's support for one feature, with the footnote that qualifies it, if any. */
export interface FeatureFinding {
  readonly support: FeatureSupport;
  /** Translation key of a footnote, under {@code comparison.notes}. */
  readonly noteKey?: string;
}

/** What the free version allows. */
export type FreeVersionLimits =
  | { readonly kind: 'none' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'described'; readonly translationKey: string };

/** One way of paying for an extension. */
export interface PaidPlan {
  readonly billing: 'monthly' | 'yearly' | 'lifetime';
  readonly amountMinorUnits: number;
  /** ISO 4217 code, as the extension charges it. */
  readonly currency: string;
}

/**
 * What an extension costs.
 *
 * <p>{@code paid} lists every plan, cheapest commitment first. {@code tabilinks} is not a figure: Tabilinks' own prices come from the payment provider at
 * run time, in the reader's currency, like everywhere else on the site.</p>
 */
export type PriceFinding =
  | { readonly kind: 'free' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'tabilinks' }
  | { readonly kind: 'paid'; readonly plans: readonly PaidPlan[] };

/** One row of the comparison. */
export interface ComparedExtension {
  /** The extension's name as its store page spells it. */
  readonly name: string;
  /** Its Chrome Web Store page, where every claim can be checked; {@code null} for Tabilinks. */
  readonly storeUrl: string | null;
  readonly features: Readonly<Record<ComparedFeature, FeatureFinding>>;
  readonly freeVersionLimits: FreeVersionLimits;
  readonly price: PriceFinding;
  /** Footnotes about the extension as a whole, under {@code comparison.notes}. */
  readonly noteKeys?: readonly string[];
}

/** When the competitors' rows were last checked against their store pages, ISO 8601. */
export const COMPARISON_CHECKED_ON = '2026-10-10';

const YES: FeatureFinding = { support: 'yes' };
const NO: FeatureFinding = { support: 'no' };
const NO_LIMITS: FreeVersionLimits = { kind: 'none' };
const FREE: PriceFinding = { kind: 'free' };

/** Opera-style speed dial tiles, which the speed dial extensions offer in place of workspaces. */
const SPEED_DIAL_WORKSPACES: FeatureFinding = {
  support: 'yes',
  noteKey: 'comparison.notes.speedDialTiles',
};

/**
 * Every row, Tabilinks first.
 *
 * <p>Tabilinks' free version limits repeat the free plan's figures in
 * {@code features/home/plan-offers/plan-offers.view-model.ts}; change both together.</p>
 */
export const COMPARED_EXTENSIONS: readonly ComparedExtension[] = [
  {
    name: 'Tabilinks',
    storeUrl: null,
    features: {
      profiles: YES,
      workspaces: YES,
      groups: YES,
      subgroups: YES,
      synchronisation: YES,
      offlineUse: { support: 'yes', noteKey: 'comparison.notes.tabilinksWithoutAccount' },
    },
    freeVersionLimits: { kind: 'described', translationKey: 'comparison.freeLimits.tabilinks' },
    price: { kind: 'tabilinks' },
  },
  {
    name: 'Speed Links',
    storeUrl:
      'https://chromewebstore.google.com/detail/speed-links/hfddiclobdhombiefaeblklchgmfhnao',
    features: {
      profiles: YES,
      workspaces: { support: 'yes', noteKey: 'comparison.notes.workspacesCalledGrupa' },
      groups: NO,
      subgroups: NO,
      synchronisation: NO,
      offlineUse: YES,
    },
    freeVersionLimits: { kind: 'described', translationKey: 'comparison.freeLimits.oneLicence' },
    price: {
      kind: 'paid',
      plans: [{ billing: 'lifetime', amountMinorUnits: 700, currency: 'EUR' }],
    },
    noteKeys: ['comparison.notes.requiresRegistration'],
  },
  {
    name: 'TileTab',
    storeUrl: 'https://chromewebstore.google.com/detail/tiletab/njiegijkfkkiibgdakejkcjlbigbemok',
    features: {
      profiles: NO,
      workspaces: NO,
      groups: { support: 'yes', noteKey: 'comparison.notes.groupsCalledSections' },
      subgroups: NO,
      synchronisation: NO,
      offlineUse: YES,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
  },
  {
    name: 'TabAtrium',
    storeUrl:
      'https://chromewebstore.google.com/detail/tabatrium-bookmark-manage/jnfhnhiapdacaohbmhmeflphndbabaag',
    features: {
      profiles: NO,
      workspaces: NO,
      groups: YES,
      subgroups: NO,
      synchronisation: YES,
      offlineUse: NO,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
    noteKeys: ['comparison.notes.requiresRegistration'],
  },
  {
    name: 'newtab01',
    storeUrl:
      'https://chromewebstore.google.com/detail/newtab01-bookmark-driven/nlecfkdndodablijmfcjbnannkgmpegj',
    features: {
      profiles: NO,
      workspaces: NO,
      groups: { support: 'partial', noteKey: 'comparison.notes.chromeBookmarkFolders' },
      subgroups: NO,
      synchronisation: { support: 'partial', noteKey: 'comparison.notes.chromeSyncOnly' },
      offlineUse: YES,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
  },
  {
    name: 'Tabisto',
    storeUrl:
      'https://chromewebstore.google.com/detail/tabisto-bookmark-manager/djaejekjeiaidoghnpndlfbnikpndngj',
    features: {
      profiles: NO,
      workspaces: YES,
      groups: YES,
      subgroups: NO,
      synchronisation: YES,
      offlineUse: YES,
    },
    freeVersionLimits: {
      kind: 'described',
      translationKey: 'comparison.freeLimits.twoWorkspacesLimitedLinks',
    },
    price: {
      kind: 'paid',
      plans: [{ billing: 'yearly', amountMinorUnits: 3500, currency: 'USD' }],
    },
  },
  {
    name: 'HappyTab',
    storeUrl:
      'https://chromewebstore.google.com/detail/happytab-bookmark-manager/jfgcegdchcfdcmjpdjeohbgpnomfljph',
    features: {
      profiles: NO,
      workspaces: NO,
      groups: YES,
      subgroups: NO,
      synchronisation: { support: 'yes', noteKey: 'comparison.notes.cloudOfYourChoice' },
      offlineUse: YES,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
  },
  {
    name: 'Speed Dial (FVD)',
    storeUrl:
      'https://chromewebstore.google.com/detail/speed-dial-fvd-new-tab-pa/llaficoajjainaijghjlofdfmbjpebpa',
    features: {
      profiles: NO,
      workspaces: SPEED_DIAL_WORKSPACES,
      groups: NO,
      subgroups: NO,
      synchronisation: {
        support: 'yes',
        noteKey: 'comparison.notes.synchronisationThroughEverSync',
      },
      offlineUse: YES,
    },
    freeVersionLimits: {
      kind: 'described',
      translationKey: 'comparison.freeLimits.everSyncFreeAccount',
    },
    price: {
      kind: 'paid',
      plans: [
        { billing: 'monthly', amountMinorUnits: 1500, currency: 'USD' },
        { billing: 'yearly', amountMinorUnits: 4499, currency: 'USD' },
        { billing: 'lifetime', amountMinorUnits: 12900, currency: 'USD' },
      ],
    },
  },
  {
    name: 'Speed Dial 2',
    storeUrl:
      'https://chromewebstore.google.com/detail/speed-dial-2-new-tab/jpfpebmajhhopeonhlcgidhclcccjcik',
    features: {
      profiles: NO,
      workspaces: { support: 'yes', noteKey: 'comparison.notes.workspacesCalledGroup' },
      groups: NO,
      subgroups: NO,
      synchronisation: { support: 'yes', noteKey: 'comparison.notes.synchronisationOnlyInPro' },
      offlineUse: { support: 'yes', noteKey: 'comparison.notes.registrationAddsNothing' },
    },
    freeVersionLimits: {
      kind: 'described',
      translationKey: 'comparison.freeLimits.noSynchronisation',
    },
    price: {
      kind: 'paid',
      plans: [{ billing: 'yearly', amountMinorUnits: 1200, currency: 'USD' }],
    },
    noteKeys: ['comparison.notes.speedDialTiles'],
  },
  {
    name: 'Stash',
    storeUrl: 'https://chromewebstore.google.com/detail/stash/cidfhadkicfcdahlpggdmcekfoejkgbh',
    features: {
      profiles: NO,
      workspaces: NO,
      groups: { support: 'yes', noteKey: 'comparison.notes.groupsCannotBeReordered' },
      subgroups: NO,
      synchronisation: NO,
      offlineUse: YES,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
  },
  {
    name: 'Foxy Tabs',
    storeUrl:
      'https://chromewebstore.google.com/detail/foxy-tabs-modern-new-tab/legkgkghbgdnjniakjhbecfiohcapejh',
    features: {
      profiles: NO,
      workspaces: SPEED_DIAL_WORKSPACES,
      groups: NO,
      subgroups: NO,
      synchronisation: NO,
      offlineUse: YES,
    },
    freeVersionLimits: NO_LIMITS,
    price: FREE,
  },
];
