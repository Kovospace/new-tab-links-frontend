import { TipSummary } from './tips-content.service';

/**
 * Lowers the case and drops the diacritics, so that a search typed without them still matches.
 *
 * <p>Slovak readers routinely type {@code historia} for {@code história}, and nobody types
 * {@code Ťahaj} with its caron into a search box — a search that insisted on them would find
 * nothing for most of the people using it.</p>
 *
 * @param text any text
 * @returns the text in lower case, with every combining mark removed
 */
export function normalizeForTipSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
}

/**
 * Whether a tip matches what the reader typed into the search.
 *
 * <p>Every word of the query must appear somewhere in the tip's title or text, in any order —
 * {@code group tab} finds the tip about tab groups. A query of only whitespace matches every tip,
 * so clearing the field shows the whole list again.</p>
 *
 * @param tip the tip, with its plain text
 * @param query what the reader typed
 * @returns true when the tip should stay in the list
 */
export function tipMatchesSearch(tip: TipSummary, query: string): boolean {
  const searchedText = normalizeForTipSearch(`${tip.title} ${tip.text}`);
  return normalizeForTipSearch(query)
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .every((word) => searchedText.includes(word));
}
