import { describe, expect, it } from 'vitest';
import { renderTipMarkdown } from '@app/core/tips/tip-markdown-renderer';

/**
 * Rendering a tip: markdown becomes HTML, and relative addresses find the tip's own files.
 */
describe('renderTipMarkdown', () => {
  it('renders markdown to HTML', () => {
    const html = renderTipMarkdown('# Title\n\nSome **bold** text.', 'en', 'profiles');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('points a relatively named image at the tip folder of the language it is written in', () => {
    const html = renderTipMarkdown('![Menu](open-menu.png)', 'sk', 'profiles');

    expect(html).toContain('src="/images/sk/tips/profiles/open-menu.png"');
    expect(html).toContain('alt="Menu"');
  });

  it('leaves absolute image paths and full URLs as written', () => {
    const html = renderTipMarkdown(
      '![a](/images/en/install/step.png) ![b](https://example.com/b.png)',
      'en',
      'profiles',
    );

    expect(html).toContain('src="/images/en/install/step.png"');
    expect(html).toContain('src="https://example.com/b.png"');
  });

  it('turns a relative link into another tip, and leaves other links alone', () => {
    const html = renderTipMarkdown(
      '[workspaces](workspaces) [download](/download) [site](https://example.com) [below](#below)',
      'en',
      'profiles',
    );

    expect(html).toContain('href="/tips/workspaces"');
    expect(html).toContain('href="/download"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('href="#below"');
  });

  it('resolves an image written as a path from the tip file, as an editor preview does', () => {
    const html = renderTipMarkdown(
      '![Menu](../../../images/sk/tips/profiles/2.png) ![Here](./1.png)',
      'sk',
      'profiles',
    );

    expect(html).toContain('src="/images/sk/tips/profiles/2.png"');
    expect(html).toContain('src="/content/tips/sk/1.png"');
  });

  it('turns a link to a sibling tip file into that tip, in the language it is written in', () => {
    const html = renderTipMarkdown(
      '[workspaces](discover-workspaces.md) [part](./discover-workspaces.md#garage)',
      'sk',
      'profiles',
    );

    expect(html).toContain('href="/sk/tips/discover-workspaces"');
    expect(html).toContain('href="/sk/tips/discover-workspaces#garage"');
  });
});
