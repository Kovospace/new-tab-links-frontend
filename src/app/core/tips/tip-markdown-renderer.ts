import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { SupportedLanguageCode } from '../i18n/supported-language';

/**
 * Turns a tip's markdown into the HTML the tip page shows.
 *
 * <p>A relatively named image — {@code ![Menu](open-menu.png)} — is found in
 * {@code /images/<language>/tips/<slug>/}, and a relatively named link is another tip; see
 * {@link renderSiteMarkdown} for the rest. The tip is the page, so its {@code #} stays an
 * {@code <h1>}.</p>
 *
 * @param markdown the tip's markdown
 * @param languageCode the language the markdown is written in
 * @param slug the tip's address below {@code /tips}
 * @returns the rendered HTML
 */
export function renderTipMarkdown(
  markdown: string,
  languageCode: SupportedLanguageCode,
  slug: string,
): string {
  return renderSiteMarkdown(markdown, { languageCode, imageFolder: `tips/${slug}` });
}
