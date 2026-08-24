/**
 * The languages this website is translated into.
 *
 * <p>Adding one means adding a matching {@code public/i18n/<code>.json} with exactly the same
 * keys as the English file, and nothing else: nothing in the code enumerates languages beyond
 * this constant.</p>
 */
export const SUPPORTED_LANGUAGE_CODES = ['en', 'sk'] as const;

/** A language code this website can display. */
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

/** Language used when nothing else has been chosen or the browser asks for an unknown one. */
export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = 'en';

/**
 * Narrows an arbitrary string to a supported language code.
 *
 * @param candidateLanguageCode value read from storage, the browser, or a query string
 * @returns true when the value names a language this website can display
 */
export function isSupportedLanguageCode(
  candidateLanguageCode: string | null | undefined,
): candidateLanguageCode is SupportedLanguageCode {
  return (
    candidateLanguageCode != null &&
    (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(candidateLanguageCode)
  );
}
