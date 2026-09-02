/**
 * A translation file as it is authored: nested objects, with string or string-array leaves.
 *
 * <p>An array leaf is one piece of text that runs to several paragraphs. It exists because a
 * translation is not always the same length in every language — the English blurb that fits in a
 * sentence may need two in Slovak — and splitting it in the translation file lets a translator
 * make that call without anybody touching a template.</p>
 */
export interface NestedTranslationFile {
  readonly [key: string]: string | readonly string[] | NestedTranslationFile;
}

/**
 * What one translation key resolves to.
 *
 * <p>A value is a single string or, for a translation authored as several paragraphs, the array
 * of them. The array is kept as one value rather than split into {@code key.0}, {@code key.1}
 * entries so that a key means the same thing in every language: the two files' key sets still
 * match when one of them says the same thing in two paragraphs and the other in one.</p>
 */
export type TranslatedValue = string | readonly string[];

/**
 * A translation file as it is used: one flat map from dotted key to its value.
 */
export type FlatTranslationDictionary = ReadonlyMap<string, TranslatedValue>;

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
  const flattenedTranslations = new Map<string, TranslatedValue>();

  for (const [keySegment, valueOrSubtree] of Object.entries(nestedTranslations)) {
    const fullKey = keyPrefix
      ? `${keyPrefix}${TRANSLATION_KEY_SEGMENT_SEPARATOR}${keySegment}`
      : keySegment;

    // An array is a leaf, not a subtree. Recursing into one would produce `key.0` and `key.1`
    // and no `key` at all, which is exactly what the page would then render.
    if (typeof valueOrSubtree === 'string' || Array.isArray(valueOrSubtree)) {
      flattenedTranslations.set(fullKey, valueOrSubtree);
      continue;
    }

    for (const [nestedKey, nestedValue] of flattenTranslationFile(
      valueOrSubtree as NestedTranslationFile,
      fullKey,
    )) {
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
