import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { ImageUrlVersioner } from '../images/image-version.store';
import { TIPS_CONTENT_ROOT } from './tips-content.service';

/**
 * Turns a tip's markdown into the HTML the tip page shows.
 *
 * <p>A relatively named image — {@code ![Menu](open-menu.png)} — is found in
 * {@code /images/<language>/tips/<slug>/}, and a relatively named link is another tip. Both may
 * also be written as paths from the tip's file, which an editor can preview —
 * {@code ../../../images/<language>/tips/<slug>/open-menu.png}, {@code other-tip.md}; see
 * {@link renderSiteMarkdown} for the rest. The tip is the page, so its {@code #} stays an
 * {@code <h1>}.</p>
 *
 * @param markdown the tip's markdown
 * @param languageCode the language the markdown is written in
 * @param slug the tip's address below {@code /tips}
 * @param versionImageUrl gives each image address the version of its file
 * @returns the rendered HTML
 */
export function renderTipMarkdown(
  markdown: string,
  languageCode: SupportedLanguageCode,
  slug: string,
  versionImageUrl: ImageUrlVersioner,
): string {
  return renderSiteMarkdown(markdown, {
    languageCode,
    imageFolder: `tips/${slug}`,
    markdownFolder: `${TIPS_CONTENT_ROOT}/${languageCode}`,
    versionImageUrl,
  });
}
