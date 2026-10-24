import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { ImageUrlVersioner } from '../images/image-version.store';
import { CHANGELOG_CONTENT_ROOT } from './changelog-content.service';

/**
 * Turns a release's markdown into the HTML its page shows — the whole file, the mandatory beginning
 * included, with its {@code #} version as the page's {@code <h1>}.
 *
 * <p>A relatively named screenshot is found in {@code /images/<language>/changelog/<version>/}.</p>
 *
 * @param markdown the release's markdown
 * @param languageCode the language the markdown is written in
 * @param version the release's version
 * @param versionImageUrl gives each image address the version of its file
 * @returns the rendered HTML
 */
export function renderReleaseMarkdown(
  markdown: string,
  languageCode: SupportedLanguageCode,
  version: string,
  versionImageUrl: ImageUrlVersioner,
): string {
  return renderSiteMarkdown(markdown, {
    languageCode,
    imageFolder: `changelog/${version}`,
    markdownFolder: `${CHANGELOG_CONTENT_ROOT}/${languageCode}`,
    versionImageUrl,
  });
}

/**
 * Reads a release's most important changes out of its markdown, for the page's description in
 * search results.
 *
 * <p>The bullets right under the first {@code ##} heading — the same ones the build script lists,
 * since every release must begin that way.</p>
 *
 * @param markdown the release's markdown
 * @returns the changes as plain text, in the order written
 */
export function readReleaseHighlights(markdown: string): readonly string[] {
  const linesAfterHeading = markdown.split(/^## .*$/m)[1] ?? '';
  const highlights: string[] = [];
  for (const line of linesAfterHeading.trim().split('\n')) {
    const bullet = /^\s*[-*+] (.*)$/.exec(line);
    if (!bullet) {
      break;
    }
    highlights.push(bullet[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, ''));
  }
  return highlights;
}
