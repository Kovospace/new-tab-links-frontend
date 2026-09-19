import { ContinentCode } from './continent';

/**
 * One country the buyer can choose.
 *
 * <p>Deliberately carries no name. Names are produced from the code by
 * {@code country-name-resolver.ts} through the platform's own locale data, so this catalogue
 * never has to be translated and cannot drift out of step with the language files.</p>
 */
export interface Country {
  /** ISO 3166-1 alpha-2 code, upper case; what the backend is told. */
  readonly code: string;

  /** Which continent's list this country appears under. */
  readonly continent: ContinentCode;

  /**
   * Whether the country is a member state of the European Union.
   *
   * <p><strong>A hint for the interface, never a tax determination.</strong> It decides what the
   * form can say about how the purchase will be handled; it does not decide how the purchase
   * *is* handled. Which payment gate a purchase actually goes through, and what tax applies,
   * are the backend's to settle — it can see the billing address the gate verified, which is
   * worth more than a dropdown the buyer picked. The EU's outermost regions alone make this flag
   * too blunt to bill on: French Guiana and Réunion are French territory and inside the EU's
   * customs area while sitting outside its VAT area.</p>
   */
  readonly isEuropeanUnionMember: boolean;
}

/**
 * Which countries appear under which continent.
 *
 * <p>Grouped rather than listed one object per country, so that the 200-odd entries stay
 * readable and a country cannot accidentally be given a continent that contradicts the list it
 * is written in.</p>
 *
 * <p>Cyprus is filed under Europe though it sits on the Asian plate, because every list a
 * European buyer expects to find it in puts it there, and it is an EU member state.</p>
 */
// prettier-ignore
const COUNTRY_CODES_BY_CONTINENT: Readonly<Record<ContinentCode, readonly string[]>> = {
  AFRICA: [
    'AO', 'BF', 'BI', 'BJ', 'BW', 'CD', 'CF', 'CG', 'CI', 'CM', 'CV', 'DJ', 'DZ', 'EG', 'EH',
    'ER', 'ET', 'GA', 'GH', 'GM', 'GN', 'GQ', 'GW', 'KE', 'KM', 'LR', 'LS', 'LY', 'MA', 'MG',
    'ML', 'MR', 'MU', 'MW', 'MZ', 'NA', 'NE', 'NG', 'RE', 'RW', 'SC', 'SD', 'SH', 'SL', 'SN',
    'SO', 'SS', 'ST', 'SZ', 'TD', 'TG', 'TN', 'TZ', 'UG', 'YT', 'ZA', 'ZM', 'ZW',
  ],
  ASIA: [
    'AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'BN', 'BT', 'CN', 'GE', 'HK', 'ID', 'IL', 'IN', 'IQ',
    'IR', 'JO', 'JP', 'KG', 'KH', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LK', 'MM', 'MN', 'MO',
    'MV', 'MY', 'NP', 'OM', 'PH', 'PK', 'PS', 'QA', 'SA', 'SG', 'SY', 'TH', 'TJ', 'TL', 'TM',
    'TR', 'TW', 'UZ', 'VN', 'YE',
  ],
  EUROPE: [
    'AD', 'AL', 'AT', 'AX', 'BA', 'BE', 'BG', 'BY', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES',
    'FI', 'FO', 'FR', 'GB', 'GG', 'GI', 'GR', 'HR', 'HU', 'IE', 'IM', 'IS', 'IT', 'JE', 'LI',
    'LT', 'LU', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'RS', 'RU',
    'SE', 'SI', 'SJ', 'SK', 'SM', 'UA', 'VA',
  ],
  NORTH_AMERICA: [
    'AG', 'AI', 'AW', 'BB', 'BL', 'BM', 'BQ', 'BS', 'BZ', 'CA', 'CR', 'CU', 'CW', 'DM', 'DO',
    'GD', 'GL', 'GP', 'GT', 'HN', 'HT', 'JM', 'KN', 'KY', 'LC', 'MF', 'MQ', 'MS', 'MX', 'NI',
    'PA', 'PM', 'PR', 'SV', 'SX', 'TC', 'TT', 'US', 'VC', 'VG', 'VI',
  ],
  OCEANIA: [
    'AS', 'AU', 'CK', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NF', 'NR', 'NU', 'NZ', 'PF',
    'PG', 'PW', 'SB', 'TK', 'TO', 'TV', 'VU', 'WF', 'WS',
  ],
  SOUTH_AMERICA: [
    'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE',
  ],
};

/**
 * The 27 member states of the European Union.
 *
 * <p>Post-Brexit, so the United Kingdom is absent; Norway, Switzerland and Iceland never were
 * members. Read the warning on {@link Country#isEuropeanUnionMember} before billing on this.</p>
 */
// prettier-ignore
const EUROPEAN_UNION_MEMBER_CODES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

/**
 * Flattens the grouped codes into the catalogue the rest of the application reads.
 *
 * @returns every country, in no particular order
 */
function buildCountryCatalogue(): readonly Country[] {
  return Object.entries(COUNTRY_CODES_BY_CONTINENT).flatMap(([continent, countryCodes]) =>
    countryCodes.map((code) => ({
      code,
      continent: continent as ContinentCode,
      isEuropeanUnionMember: EUROPEAN_UNION_MEMBER_CODES.has(code),
    })),
  );
}

/**
 * Every country the purchase form knows about.
 *
 * <p>Built once at module load: the source data is constant, and rebuilding it per keystroke of
 * a continent change would be work done for nothing.</p>
 */
export const COUNTRY_CATALOGUE: readonly Country[] = buildCountryCatalogue();

/**
 * The countries on one continent.
 *
 * @param continent which continent's list is wanted
 * @returns its countries, unordered — the caller sorts them once it knows the language
 */
export function findCountriesOnContinent(continent: ContinentCode): readonly Country[] {
  return COUNTRY_CATALOGUE.filter((country) => country.continent === continent);
}
