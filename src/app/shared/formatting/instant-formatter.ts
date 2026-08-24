import { SupportedLanguageCode } from '../../core/i18n/supported-language';

/** How a moment is spelled out: full date plus hours and minutes, no seconds. */
const DATE_AND_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** Locales the supported languages map onto for formatting purposes. */
const FORMATTING_LOCALES: Readonly<Record<SupportedLanguageCode, string>> = {
  en: 'en-GB',
  sk: 'sk-SK',
};

/**
 * Spells out an ISO-8601 instant in the reader's language.
 *
 * <p>A free function rather than a pipe, because the project's rule keeps data transformation
 * out of templates: view-models call this and expose the finished string. Every timestamp the
 * backend sends is UTC ISO-8601, and the browser renders it in the reader's own time zone.</p>
 *
 * @param isoInstant   timestamp as the backend sent it
 * @param languageCode language the page is displayed in
 * @returns the formatted moment, or an empty string when the value is missing or unparseable
 */
export function formatInstantForDisplay(
  isoInstant: string | null | undefined,
  languageCode: SupportedLanguageCode,
): string {
  if (!isoInstant) {
    return '';
  }

  const parsedInstant = new Date(isoInstant);
  if (Number.isNaN(parsedInstant.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(FORMATTING_LOCALES[languageCode], DATE_AND_TIME_FORMAT).format(
    parsedInstant,
  );
}
