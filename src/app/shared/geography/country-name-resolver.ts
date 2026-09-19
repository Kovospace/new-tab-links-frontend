import { SupportedLanguageCode } from '../../core/i18n/supported-language';
import { ContinentCode } from './continent';
import { Country, findCountriesOnContinent } from './country-catalogue';

/** Locales the supported languages map onto, matching {@code instant-formatter.ts}. */
const DISPLAY_LOCALES: Readonly<Record<SupportedLanguageCode, string>> = {
  en: 'en-GB',
  sk: 'sk-SK',
};

/**
 * A country as a dropdown renders it: a value to submit and a name to read.
 */
export interface PresentedCountry {
  /** ISO 3166-1 alpha-2 code, which is what the form submits. */
  readonly code: string;

  /** The country's name in the reader's language. */
  readonly name: string;
}

/**
 * Remembers one formatter per language.
 *
 * <p>Constructing an {@code Intl.DisplayNames} is not free, and the country list is rebuilt
 * whenever the continent or the language changes. Two entries is the whole cache.</p>
 */
const displayNamesByLocale = new Map<string, Intl.DisplayNames>();

/**
 * Names countries in the reader's own language, using the platform's locale data.
 *
 * <p><strong>Why these names are not in {@code public/i18n} like every other string.</strong>
 * The repo's rule is that user-visible wording lives in the language files, and it is the right
 * rule for wording this project chooses. Country names are not that: they are standardised, there
 * are roughly two hundred of them, and hand-translating them into Slovak would add some four
 * hundred entries that no one would ever review and that would still be less correct than the
 * CLDR data every browser already carries. {@code Intl.DisplayNames} is part of the platform, so
 * this costs no dependency and no bundle weight. Continent names *are* translated normally —
 * there are six of them and they are the project's own wording.</p>
 *
 * @param languageCode language the page is displayed in
 * @returns a formatter for that language, reused across calls
 */
function resolveDisplayNames(languageCode: SupportedLanguageCode): Intl.DisplayNames {
  const locale = DISPLAY_LOCALES[languageCode];
  const cached = displayNamesByLocale.get(locale);
  if (cached) {
    return cached;
  }

  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  displayNamesByLocale.set(locale, displayNames);
  return displayNames;
}

/**
 * Spells out one country's name.
 *
 * <p>Falls back to the code itself when the platform has no name for it. That is the same choice
 * the translation service makes for an unknown key: something visible and diagnosable beats a
 * blank entry in a dropdown.</p>
 *
 * @param countryCode  ISO 3166-1 alpha-2 code
 * @param languageCode language the page is displayed in
 * @returns the country's name, or the code when it cannot be resolved
 */
export function resolveCountryName(
  countryCode: string,
  languageCode: SupportedLanguageCode,
): string {
  try {
    return resolveDisplayNames(languageCode).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

/**
 * The countries of one continent, named and ordered for a dropdown.
 *
 * <p>Sorted by the *translated* name with a locale-aware comparison, because a list of countries
 * is long enough that a reader scans it alphabetically — and "Österreich" belongs where Slovak
 * and English each expect it, which a plain string sort does not deliver.</p>
 *
 * @param continent    which continent's countries are wanted
 * @param languageCode language the page is displayed in
 * @returns the countries, ready to render
 */
export function listCountriesForDisplay(
  continent: ContinentCode,
  languageCode: SupportedLanguageCode,
): readonly PresentedCountry[] {
  const collator = new Intl.Collator(DISPLAY_LOCALES[languageCode]);

  return findCountriesOnContinent(continent)
    .map((country: Country) => ({
      code: country.code,
      name: resolveCountryName(country.code, languageCode),
    }))
    .sort((left, right) => collator.compare(left.name, right.name));
}
