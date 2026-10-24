import { describe, expect, it } from 'vitest';
import { readReleaseHighlights } from '@app/core/changelog/release-markdown';

/**
 * A release's highlights are the bullets right under its first ## heading.
 */
describe('readReleaseHighlights', () => {
  it('reads the bullets under the heading, without markdown, and stops where they end', () => {
    const markdown = [
      '# 0.3.0',
      '',
      '*Released: 2026-10-20*',
      '',
      '## Most important changes',
      '',
      '- A **new** theme',
      '- A [tip](../../tips/en/choose-theme.md) about it',
      '',
      'The description.',
      '',
      '- Not a highlight',
    ].join('\n');

    expect(readReleaseHighlights(markdown)).toEqual(['A new theme', 'A tip about it']);
  });
});
