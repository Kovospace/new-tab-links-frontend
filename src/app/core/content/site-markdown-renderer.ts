import { Marked, Tokens } from 'marked';
import { buildLocalizedImageUrl } from '../i18n/localized-image.pipe';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { localizeTipLink } from '../routing/localized-route-links';

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
   * The folder the markdown file itself is served from — {@code /content/tips/sk} for a Slovak
   * tip. Addresses written as paths from the file ({@code ../../../images/…}, {@code other.md})
   * are resolved against it, the way an editor's preview resolves them.
   */
  readonly markdownFolder: string;
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
 * <p>Each also has a long form, a real path from the markdown file to the file it means, so an
 * editor's markdown preview can show the image and follow the link:</p>
 *
 * <ul>
 *   <li>an image starting {@code ./} or {@code ../} —
 *   {@code ![Menu](../../../images/sk/tips/profiles/open-menu.png)} — is resolved against
 *   {@code markdownFolder}, giving {@code /images/sk/tips/profiles/open-menu.png};</li>
 *   <li>a link to a tip's markdown file — {@code [profiles](profiles.md)}, or
 *   {@code ../../tips/sk/profiles.md} from another folder — becomes that tip,
 *   {@code /tips/profiles}. A link resolving to any other markdown file is left as written.</li>
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
        resolveTipLinkAddress(token as Tokens.Link, options);
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
  if (isWrittenAsFilePath(image.href)) {
    image.href = resolveAgainstFolder(image.href, options.markdownFolder);
  } else if (isRelative(image.href)) {
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
 * Points a relatively named link at a tip, in the language the markdown is written in.
 *
 * <p>The markdown's language rather than the reader's: they differ only while a tip is shown in
 * English for want of a translation, and a reader who prefers another language is redirected to
 * that language's address on arrival anyway.</p>
 *
 * @param link the link token, changed in place
 * @param options where the markdown sits
 */
function resolveTipLinkAddress(link: Tokens.Link, options: SiteMarkdownRenderingOptions): void {
  if (!isRelative(link.href)) {
    return;
  }
  if (!isMarkdownFileLink(link.href)) {
    link.href = localizeTipLink(link.href, options.languageCode);
    return;
  }
  const tipSlugAndFragment = tipSlugOfMarkdownFile(
    resolveAgainstFolder(link.href, options.markdownFolder),
  );
  if (tipSlugAndFragment !== null) {
    link.href = localizeTipLink(tipSlugAndFragment, options.languageCode);
  }
}

/**
 * Names the tip a served markdown file is, if it is one.
 *
 * <p>Any language's folder counts: the link is localized to the markdown's own language anyway,
 * which is the copy a reader of that language is shown.</p>
 *
 * @param resolvedPath an absolute path such as {@code /content/tips/sk/profiles.md#part}
 * @returns the tip's slug with any fragment kept — {@code profiles#part} — or {@code null}
 */
function tipSlugOfMarkdownFile(resolvedPath: string): string | null {
  const tipFile = /^\/content\/tips\/[^/]+\/([^/?#]+)\.md(#.*)?$/.exec(resolvedPath);
  return tipFile === null ? null : `${tipFile[1]}${tipFile[2] ?? ''}`;
}

/**
 * Whether a link names a markdown file rather than a tip by its slug.
 *
 * @param address a relative address as written in the markdown
 * @returns true for {@code profiles.md}, {@code ../../tips/sk/profiles.md#part} and the like
 */
function isMarkdownFileLink(address: string): boolean {
  return /\.md(?:#.*)?$/i.test(address);
}

/**
 * Whether a relative image address is written as a path from the markdown file.
 *
 * <p>Only an explicit {@code ./} or {@code ../} counts, so that a bare file name keeps meaning the
 * image folder, as it always has.</p>
 *
 * @param address the address as written in the markdown
 * @returns true when it starts with {@code ./} or {@code ../}
 */
function isWrittenAsFilePath(address: string): boolean {
  return /^\.\.?\//.test(address);
}

/**
 * Resolves a path written from the markdown file into an absolute path on this site.
 *
 * @param address the relative address, e.g. {@code ../../../images/sk/tips/profiles/1.png}
 * @param markdownFolder the folder the markdown is served from, e.g. {@code /content/tips/sk}
 * @returns the absolute path, with any fragment kept
 */
function resolveAgainstFolder(address: string, markdownFolder: string): string {
  // Any origin will do; only the path is kept, so the HTML does not depend on where it is served.
  const resolved = new URL(address, `https://site.invalid${markdownFolder.replace(/\/*$/, '/')}`);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
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
