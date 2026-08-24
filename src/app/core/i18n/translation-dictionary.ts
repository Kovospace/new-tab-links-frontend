/**
 * A translation file as it is authored: nested objects, string leaves.
 */
export interface NestedTranslationFile {
  readonly [key: string]: string | NestedTranslationFile;
}

/**
 * A translation file as it is used: one flat map from dotted key to text.
 */
export type FlatTranslationDictionary = ReadonlyMap<string, string>;

/** Separator between the segments of a translation key. */
const TRANSLATION_KEY_SEGMENT_SEPARATOR = '.';

/** Opening and closing markers around a placeholder inside a translated string. */
const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

/**
 * Flattens an authored translation file into the dotted-key map lookups use.
 *
 * <p>Done once per language load rather than on every lookup: nesting is convenient to write and
 * a flat map is fast to read, and there is no reason to pay for the walk on each binding.</p>
 *
 * @param nestedTranslations the parsed translation file
 * @param keyPrefix          accumulated key of the enclosing objects, empty at the top level
 * @returns every leaf of the file, keyed by its full dotted path
 */
export function flattenTranslationFile(
  nestedTranslations: NestedTranslationFile,
  keyPrefix = '',
): FlatTranslationDictionary {
  const flattenedTranslations = new Map<string, string>();

  for (const [keySegment, valueOrSubtree] of Object.entries(nestedTranslations)) {
    const fullKey = keyPrefix
      ? `${keyPrefix}${TRANSLATION_KEY_SEGMENT_SEPARATOR}${keySegment}`
      : keySegment;

    if (typeof valueOrSubtree === 'string') {
      flattenedTranslations.set(fullKey, valueOrSubtree);
      continue;
    }

    for (const [nestedKey, nestedValue] of flattenTranslationFile(valueOrSubtree, fullKey)) {
      flattenedTranslations.set(nestedKey, nestedValue);
    }
  }

  return flattenedTranslations;
}

/**
 * Substitutes {@code {placeholder}} markers in a translated string.
 *
 * <p>A placeholder with no matching value is left in place rather than blanked, because a
 * visible {@code {year}} in the page is a bug report and an empty gap is not.</p>
 *
 * @param translatedText    text taken from the dictionary
 * @param placeholderValues values to substitute, keyed by placeholder name
 * @returns the text with every known placeholder replaced
 */
export function fillPlaceholders(
  translatedText: string,
  placeholderValues: Readonly<Record<string, string | number>> | undefined,
): string {
  if (!placeholderValues) {
    return translatedText;
  }

  return translatedText.replace(PLACEHOLDER_PATTERN, (marker, placeholderName: string) =>
    placeholderName in placeholderValues ? String(placeholderValues[placeholderName]) : marker,
  );
}
