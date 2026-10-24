import { describe, expect, it } from 'vitest';
import { readFaqEntries } from '@app/core/faq/faq-entries';
import { buildFaqPageStructuredData } from '@app/core/faq/faq-structured-data';

/**
 * The FAQ's markdown is read back into questions and plain-text answers for its structured data.
 */
describe('readFaqEntries', () => {
  const markdown = [
    '# Frequently asked questions',
    '',
    'An introduction no question owns.',
    '',
    '## Is it **free**?',
    '',
    'Yes. See [premium](../../tips/en/discover-premium-features.md).',
    '',
    '- One *profile*',
    '![Plans](plans.webp)',
    '',
    '## A question nobody answered yet',
    '',
    '## Do I need an account?',
    'No.',
  ].join('\n');

  it('pairs every ## heading with the text under it, as a reader sees it', () => {
    expect(readFaqEntries(markdown)).toEqual([
      { question: 'Is it **free**?', answer: 'Yes. See premium. One profile' },
      { question: 'Do I need an account?', answer: 'No.' },
    ]);
  });

  it('skips a question with no answer, which a search engine would refuse', () => {
    expect(readFaqEntries(markdown).map((entry) => entry.question)).not.toContain(
      'A question nobody answered yet',
    );
  });
});

describe('buildFaqPageStructuredData', () => {
  it('describes the entries as a schema.org FAQPage', () => {
    expect(buildFaqPageStructuredData([{ question: 'Q?', answer: 'A.' }], 'sk')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'sk',
      mainEntity: [
        { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
      ],
    });
  });
});
