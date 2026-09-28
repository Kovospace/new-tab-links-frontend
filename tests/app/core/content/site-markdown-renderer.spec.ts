import { describe, expect, it } from 'vitest';
import { renderSiteMarkdown } from '@app/core/content/site-markdown-renderer';

/**
 * What the shared renderer adds beyond a tip's: its own image folder, and headings pushed down.
 */
describe('renderSiteMarkdown', () => {
  it('finds a relatively named image in the folder it is given', () => {
    const html = renderSiteMarkdown('![Sync](two-devices.png)', {
      languageCode: 'sk',
      imageFolder: 'home-features/synchronised-everywhere',
    });

    expect(html).toContain(
      'src="/images/sk/home-features/synchronised-everywhere/two-devices.png"',
    );
  });

  it('pushes every heading down by the offset, never past h6', () => {
    const html = renderSiteMarkdown('# Title\n\n## Part\n\n###### Deepest', {
      languageCode: 'en',
      imageFolder: 'home-features/x',
      headingLevelOffset: 1,
    });

    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<h3>Part</h3>');
    expect(html).toContain('<h6>Deepest</h6>');
  });

  it('leaves headings where they are without an offset', () => {
    const html = renderSiteMarkdown('# Title', { languageCode: 'en', imageFolder: 'tips/x' });

    expect(html).toContain('<h1>Title</h1>');
  });
});
