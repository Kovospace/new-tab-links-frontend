import { describeTipMarkdown } from '@app/core/tips/tip-page-description';

describe('describeTipMarkdown', () => {
  it('takes the title from the first heading and the description from the first paragraph', () => {
    const markdown = [
      '# Catch links into a tab group',
      '',
      'A subgroup can pull tabs into a',
      'Chrome tab group of its own.',
      '',
      '## Turning it on',
    ].join('\n');

    expect(describeTipMarkdown(markdown)).toEqual({
      title: 'Catch links into a tab group',
      description: 'A subgroup can pull tabs into a Chrome tab group of its own.',
    });
  });

  it('strips links and emphasis, leaving the words a search result shows', () => {
    const markdown = '# Title\n\nTurn on **Catch links** in the [subgroup menu](menu.md).';

    expect(describeTipMarkdown(markdown)?.description).toBe(
      'Turn on Catch links in the subgroup menu.',
    );
  });

  it('skips images, lists and HTML comments before the first prose', () => {
    const markdown = '# Title\n\n![Menu](menu.png)\n\n<!-- note -->\n\n1. Step\n\nThe prose.';

    expect(describeTipMarkdown(markdown)?.description).toBe('The prose.');
  });

  it('cuts a long paragraph at a word, short enough for a search result', () => {
    const description = describeTipMarkdown(`# Title\n\n${'word '.repeat(60)}`)?.description ?? '';

    expect(description.length).toBeLessThanOrEqual(160);
    expect(description.endsWith('word…')).toBe(true);
  });

  it('gives nothing for a tip without a heading, leaving the route to name the page', () => {
    expect(describeTipMarkdown('Just prose.')).toBeNull();
  });
});
