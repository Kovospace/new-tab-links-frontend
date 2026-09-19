/**
 * The continents a buyer can be asked to choose from.
 *
 * <p>Six rather than seven: Antarctica is left out because nobody buys a subscription from it,
 * and offering it would only add an empty country list to the form.</p>
 *
 * <p>These are codes, not labels. The wording lives in {@code public/i18n} under
 * {@code geography.continent.*}, so a continent added here needs a key in both language files.</p>
 */
export type ContinentCode =
  'AFRICA' | 'ASIA' | 'EUROPE' | 'NORTH_AMERICA' | 'OCEANIA' | 'SOUTH_AMERICA';

/**
 * Every continent, in the order the form offers them.
 *
 * <p>Alphabetical by English name, which is stable: ordering by the *translated* name would make
 * the list jump around when the reader switches language, for no gain — a continent list is short
 * enough to scan in any order.</p>
 */
export const CONTINENT_CODES: readonly ContinentCode[] = [
  'AFRICA',
  'ASIA',
  'EUROPE',
  'NORTH_AMERICA',
  'OCEANIA',
  'SOUTH_AMERICA',
];
