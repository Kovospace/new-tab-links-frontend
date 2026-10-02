import {
  DEFAULT_LANGUAGE_CODE,
  SupportedLanguageCode,
  isSupportedLanguageCode,
} from './supported-language';

/**
 * An address taken apart into the language its prefix names and the page it points at.
 */
export interface LanguagePrefixedAddress {
  /** The language the prefix names, or null for an address without one. */
  readonly languageCode: SupportedLanguageCode | null;

  /** The same address without the prefix, query and fragment kept: {@code /sk/tips?x} → {@code /tips?x}. */
  readonly unprefixedAddress: string;
}

/**
 * Builds a public page's address in one language.
 *
 * <p>The default language keeps the address it always had, so that links already shared, indexed
 * or opened by the extension keep working. Every other language is one folder down:
 * {@code /tips} in Slovak is {@code /sk/tips}, and the home page is {@code /sk}.</p>
 *
 * @param unprefixedAddress the page's address in the default language, starting with a slash,
 *   optionally carrying a query and fragment
 * @param languageCode the language wanted
 * @returns the address of the same page in that language
 */
export function localizeAddress(
  unprefixedAddress: string,
  languageCode: SupportedLanguageCode,
): string {
  if (languageCode === DEFAULT_LANGUAGE_CODE) {
    return unprefixedAddress;
  }
  const [path, rest] = splitPathFromRest(unprefixedAddress);
  return `/${languageCode}${path === '/' ? '' : path}${rest}`;
}

/**
 * Takes the language prefix off an address, if it has one.
 *
 * <p>Only a language other than the default counts as a prefix, because only those are ever
 * written. {@code /en/tips} is therefore not English tips but an unknown page.</p>
 *
 * @param address an address as the router reports it
 * @returns the prefix's language, and the address without it
 */
export function splitLanguagePrefix(address: string): LanguagePrefixedAddress {
  const [path, rest] = splitPathFromRest(address);
  const firstSegment = path.split('/')[1] ?? '';
  if (!isSupportedLanguageCode(firstSegment) || firstSegment === DEFAULT_LANGUAGE_CODE) {
    return { languageCode: null, unprefixedAddress: address };
  }
  const remainingPath = path.slice(firstSegment.length + 1) || '/';
  return { languageCode: firstSegment, unprefixedAddress: `${remainingPath}${rest}` };
}

/**
 * Splits an address at its query or fragment, whichever comes first.
 *
 * @param address such as {@code /tips?a=1#b}
 * @returns the path ({@code /tips}) and everything after it ({@code ?a=1#b}), the path never empty
 */
function splitPathFromRest(address: string): readonly [string, string] {
  const restStart = address.search(/[?#]/);
  const path = restStart === -1 ? address : address.slice(0, restStart);
  const rest = restStart === -1 ? '' : address.slice(restStart);
  return [path || '/', rest];
}
