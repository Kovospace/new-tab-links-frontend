import { Marked, Tokens } from 'marked';
import { buildLocalizedImageUrl } from '../i18n/localized-image.pipe';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { APPLICATION_ROUTE_LINKS } from '../routing/application-route-paths';

/** Where a piece of the site's markdown sits, which decides what its relative addresses mean. */
export interface SiteMarkdownRenderingOptions {
  /** The language the markdown is written in, which picks that language's images. */
  readonly languageCode: SupportedLanguageCode;
  /**
   * The folder below {@code /images/<language>/} its relatively named images live in —
   * {@code tips/profiles} for a tip, {@code home-features/workspaces} for a home page point.
   */
  readonly imageFolder: string;
  /**
   * How many levels every heading is pushed down; 0 when omitted.
   *
   * <p>Every file is written with its title as {@code #}, so they all read alike. On a page of its
   * own that is the page's {@code <h1>}; embedded under a page's own {@code <h1>} it has to become
   * an {@code <h2>}, or the page would have several.</p>
   */
  readonly headingLevelOffset?: number;
}

/** The deepest heading HTML has. */
const DEEPEST_HEADING_LEVEL = 6;

/**
 * Turns a piece of the site's markdown — a tip, a home page point — into HTML.
 *
 * <p>Two kinds of address are resolved on the way, so the markdown can stay short and portable:</p>
 *
 * <ul>
 *   <li>an image named relatively — {@code ![Menu](open-menu.png)} — becomes
 *   {@code /images/<language>/<imageFolder>/open-menu.png}, next to the rest of that language's
 *   screenshots, which is the convention the localized images already follow;</li>
 *   <li>a link named relatively — {@code [profiles](profiles)} — becomes {@code /tips/profiles},
 *   a tip, which is the one kind of page there are many of to link to.</li>
 * </ul>
 *
 * <p>Absolute paths, full URLs and in-page anchors are left exactly as written.</p>
 *
 * <p>The HTML is not trusted by being ours: it is bound with {@code [innerHTML]}, which Angular
 * sanitises, so a script or an event handler in a markdown file is dropped rather than run.</p>
 *
 * @param markdown the markdown
 * @param options where the markdown sits
 * @returns the rendered HTML
 */
export function renderSiteMarkdown(
  markdown: string,
  options: SiteMarkdownRenderingOptions,
): string {
  const headingLevelOffset = options.headingLevelOffset ?? 0;
  const renderer = new Marked({
    walkTokens: (token) => {
      if (token.type === 'image') {
        resolveImageAddress(token as Tokens.Image, options);
      } else if (token.type === 'link') {
        resolveTipLinkAddress(token as Tokens.Link);
      } else if (token.type === 'heading') {
        lowerHeading(token as Tokens.Heading, headingLevelOffset);
      }
    },
  });
  return renderer.parse(markdown, { async: false });
}

/**
 * Points a relatively named image at its folder of the language's images.
 *
 * @param image the image token, changed in place
 * @param options where the markdown sits
 */
function resolveImageAddress(image: Tokens.Image, options: SiteMarkdownRenderingOptions): void {
  if (isRelative(image.href)) {
    // Absolute, although the helper answers relative to the document's base: rendered HTML should
    // not depend on <base href> to find its images.
    const localizedPath = buildLocalizedImageUrl(
      `${options.imageFolder}/${image.href}`,
      options.languageCode,
    );
    image.href = `/${localizedPath.replace(/^\/+/, '')}`;
  }
}

/**
 * Points a relatively named link at a tip.
 *
 * @param link the link token, changed in place
 */
function resolveTipLinkAddress(link: Tokens.Link): void {
  if (isRelative(link.href)) {
    link.href = `${APPLICATION_ROUTE_LINKS.tips}/${link.href}`;
  }
}

/**
 * Pushes a heading down, never past the deepest level HTML has.
 *
 * @param heading the heading token, changed in place
 * @param headingLevelOffset how many levels to push it down
 */
function lowerHeading(heading: Tokens.Heading, headingLevelOffset: number): void {
  heading.depth = Math.min(heading.depth + headingLevelOffset, DEEPEST_HEADING_LEVEL);
}

/**
 * Whether an address was written relative to the markdown.
 *
 * @param address the address as written in the markdown
 * @returns false for absolute paths, anything with a scheme, and in-page anchors
 */
function isRelative(address: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(address);
}
