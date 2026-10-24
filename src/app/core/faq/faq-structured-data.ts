import { FaqEntry } from './faq-entries';

/**
 * Describes the FAQ to search engines and AI answer engines as schema.org {@code FAQPage}.
 *
 * <p>This is what the FAQ is for: a crawler that finds the questions marked up as questions can
 * quote an answer directly, where it would otherwise have to guess which paragraph answers what.
 * See {@link https://schema.org/FAQPage}.</p>
 *
 * @param entries the questions and their plain-text answers
 * @param languageCode the language they are written in
 * @returns the JSON-LD object, ready to serialise
 */
export function buildFaqPageStructuredData(
  entries: readonly FaqEntry[],
  languageCode: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: languageCode,
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
