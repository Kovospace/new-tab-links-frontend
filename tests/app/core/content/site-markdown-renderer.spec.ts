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
      markdownFolder: '/content/home-features/sk',
    });

    expect(html).toContain(
      'src="/images/sk/home-features/synchronised-everywhere/two-devices.png"',
    );
  });

  it('gives an image named _1x a srcset of its 2x and 3x siblings', () => {
    const html = renderSiteMarkdown('![Menu](open-menu_1x.webp)', {
      languageCode: 'sk',
      imageFolder: 'tips/profiles',
      markdownFolder: '/content/tips/sk',
    });

    expect(html).toContain('src="/images/sk/tips/profiles/open-menu_1x.webp"');
    expect(html).toContain(
      'srcset="/images/sk/tips/profiles/open-menu_1x.webp 1x, ' +
        '/images/sk/tips/profiles/open-menu_2x.webp 2x, ' +
        '/images/sk/tips/profiles/open-menu_3x.webp 3x"',
    );
    expect(html).toContain('alt="Menu"');
  });

  it('gives a _1x image written as a path from the file the same srcset', () => {
    const html = renderSiteMarkdown('![Menu](../../../images/sk/tips/profiles/open-menu_1x.webp)', {
      languageCode: 'sk',
      imageFolder: 'tips/profiles',
      markdownFolder: '/content/tips/sk',
    });

    expect(html).toContain('/images/sk/tips/profiles/open-menu_3x.webp 3x');
  });

  it('leaves an image without _1x in its name without a srcset', () => {
    const html = renderSiteMarkdown('![Menu](open-menu.webp) ![Big](open-menu_2x.webp)', {
      languageCode: 'sk',
      imageFolder: 'tips/profiles',
      markdownFolder: '/content/tips/sk',
    });

    expect(html).not.toContain('srcset');
  });

  it('pushes every heading down by the offset, never past h6', () => {
    const html = renderSiteMarkdown('# Title\n\n## Part\n\n###### Deepest', {
      languageCode: 'en',
      imageFolder: 'home-features/x',
      markdownFolder: '/content/home-features/en',
      headingLevelOffset: 1,
    });

    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<h3>Part</h3>');
    expect(html).toContain('<h6>Deepest</h6>');
  });

  it('leaves headings where they are without an offset', () => {
    const html = renderSiteMarkdown('# Title', {
      languageCode: 'en',
      imageFolder: 'tips/x',
      markdownFolder: '/content/tips/en',
    });

    expect(html).toContain('<h1>Title</h1>');
  });

  it('resolves an image written as a path from the markdown file against its folder', () => {
    const html = renderSiteMarkdown('![Sync](../../../images/sk/home-features/sync/two.png)', {
      languageCode: 'sk',
      imageFolder: 'home-features/sync',
      markdownFolder: '/content/home-features/sk',
    });

    expect(html).toContain('src="/images/sk/home-features/sync/two.png"');
  });

  it('turns a link to a tip file in another content folder into that tip', () => {
    const html = renderSiteMarkdown('[profiles](../../tips/sk/discover-profiles.md)', {
      languageCode: 'sk',
      imageFolder: 'home-features/sync',
      markdownFolder: '/content/home-features/sk',
    });

    expect(html).toContain('href="/sk/tips/discover-profiles"');
  });

  it('leaves a link to a markdown file that is not a tip as written', () => {
    const html = renderSiteMarkdown('[terms](../../legal/en/terms.md)', {
      languageCode: 'en',
      imageFolder: 'tips/x',
      markdownFolder: '/content/tips/en',
    });

    expect(html).toContain('href="../../legal/en/terms.md"');
  });
});
