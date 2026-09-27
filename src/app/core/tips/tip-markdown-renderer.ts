import { Marked, Tokens } from 'marked';
import { buildLocalizedImageUrl } from '../i18n/localized-image.pipe';
import { SupportedLanguageCode } from '../i18n/supported-language';

/**
 * Turns a tip's markdown into the HTML the tip page shows.
 *
 * <p>Two kinds of address are resolved on the way, so the markdown can stay short and portable:</p>
 *
 * <ul>
 *   <li>an image named relatively — {@code ![Menu](open-menu.png)} — becomes
 *   {@code /images/<language>/tips/<slug>/open-menu.png}, next to the rest of that language's
 *   screenshots, which is the convention the localized images already follow;</li>
 *   <li>a link named relatively — {@code [profiles](profiles)} — becomes {@code /tips/profiles},
 *   another tip.</li>
 * </ul>
 *
 * <p>Absolute paths, full URLs and in-page anchors are left exactly as written.</p>
 *
 * <p>The HTML is not trusted by being ours: it is bound with {@code [innerHTML]}, which Angular
 * sanitises, so a script or an event handler in a markdown file is dropped rather than run.</p>
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
  const renderer = new Marked({
    walkTokens: (token) => {
      if (token.type === 'image') {
        resolveImageAddress(token as Tokens.Image, languageCode, slug);
      } else if (token.type === 'link') {
        resolveTipLinkAddress(token as Tokens.Link);
      }
    },
  });
  return renderer.parse(markdown, { async: false });
}

/**
 * Points a relatively named image at its tip's screenshot folder.
 *
 * @param image the image token, changed in place
 * @param languageCode the language the markdown is written in
 * @param slug the tip's address below {@code /tips}
 */
function resolveImageAddress(
  image: Tokens.Image,
  languageCode: SupportedLanguageCode,
  slug: string,
): void {
  if (isRelative(image.href)) {
    // Absolute, although the helper answers relative to the document's base: rendered HTML should
    // not depend on <base href> to find its images.
    const localizedPath = buildLocalizedImageUrl(`tips/${slug}/${image.href}`, languageCode);
    image.href = `/${localizedPath.replace(/^\/+/, '')}`;
  }
}

/**
 * Points a relatively named link at another tip.
 *
 * @param link the link token, changed in place
 */
function resolveTipLinkAddress(link: Tokens.Link): void {
  if (isRelative(link.href)) {
    link.href = `/tips/${link.href}`;
  }
}

/**
 * Whether an address was written relative to the tip.
 *
 * @param address the address as written in the markdown
 * @returns false for absolute paths, anything with a scheme, and in-page anchors
 */
function isRelative(address: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(address);
}
