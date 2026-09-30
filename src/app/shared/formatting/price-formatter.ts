import { SupportedLanguageCode } from '../../core/i18n/supported-language';
import { FORMATTING_LOCALES } from './instant-formatter';

/**
 * Spells out a price in the reader's language — {@code €4.68} in English, {@code 4,68 €} in
 * Slovak.
 *
 * <p>Nothing here knows any particular currency. How many minor units make a major one (100 for
 * EUR and USD, 1 for JPY), the symbol and where it goes all come from {@code Intl}, so a currency
 * the payment provider adds later is formatted correctly without a change here.</p>
 *
 * @param amountMinorUnits the price in the currency's minor units, as the backend sends it
 * @param currency ISO 4217 code
 * @param languageCode the language the page is displayed in
 * @returns the formatted price, or the amount beside the bare code for a code {@code Intl} does not
 *     know
 */
export function formatPrice(
  amountMinorUnits: number,
  currency: string,
  languageCode: SupportedLanguageCode,
): string {
  try {
    const formatter = new Intl.NumberFormat(FORMATTING_LOCALES[languageCode], {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    });
    return formatter.format(amountMinorUnits / minorUnitsPerMajorUnit(formatter));
  } catch {
    return `${amountMinorUnits} ${currency}`;
  }
}

/**
 * Names a currency for a picker: its symbol and code, and its full name.
 *
 * @param currency ISO 4217 code
 * @param languageCode the language the page is displayed in
 * @returns a short label such as {@code € EUR} and a name such as {@code Euro}; the code for both
 *     when {@code Intl} does not know it
 */
export function describeCurrency(
  currency: string,
  languageCode: SupportedLanguageCode,
): { readonly shortLabel: string; readonly name: string } {
  const locale = FORMATTING_LOCALES[languageCode];
  try {
    const symbol = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value;
    const name = new Intl.DisplayNames(locale, { type: 'currency' }).of(currency) ?? currency;
    return { shortLabel: symbol && symbol !== currency ? `${symbol} ${currency}` : currency, name };
  } catch {
    return { shortLabel: currency, name: currency };
  }
}

/**
 * How many minor units a currency's major unit holds, from the decimals {@code Intl} gives it.
 *
 * @param formatter a currency formatter for the currency in question
 * @returns 100 for a currency with two decimals, 1 for one with none
 */
function minorUnitsPerMajorUnit(formatter: Intl.NumberFormat): number {
  return 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2);
}
