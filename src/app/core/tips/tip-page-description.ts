import { LoadedPageDescription } from '../seo/page-metadata';

/** Longest description kept. Search results cut off at roughly this many characters anyway. */
const DESCRIPTION_MAXIMUM_LENGTH = 160;

/** Lines that open something other than prose: headings, lists, images, HTML, quotes, tables, code. */
const NON_PROSE_LINE_PATTERN = /^(?:#|[-*+] |\d+\. |!\[|<|>|\||```)/;

/**
 * Describes a tip for search results and link previews, from its markdown.
 *
 * <p>The title is the first {@code # } heading, the same one the tips index lists the tip by. The
 * description is the first paragraph of prose, stripped of markdown and cut to a search result's
 * length. Written from the tip itself so a new tip needs nothing beyond its markdown file.</p>
 *
 * @param markdown the tip's markdown, in the language it is being shown in
 * @returns the title and description, or null when the tip has no heading to name it by
 */
export function describeTipMarkdown(markdown: string): LoadedPageDescription | null {
  const lines = markdown.split('\n').map((line) => line.trim());
  const heading = lines.find((line) => line.startsWith('# '));
  if (!heading) {
    return null;
  }
  return {
    title: heading.slice(2).trim(),
    description: shortenToDescription(stripInlineMarkdown(readFirstParagraph(lines))),
  };
}

function readFirstParagraph(lines: readonly string[]): string {
  const firstProseIndex = lines.findIndex(
    (line) => line !== '' && !NON_PROSE_LINE_PATTERN.test(line),
  );
  if (firstProseIndex === -1) {
    return '';
  }
  const paragraphLines: string[] = [];
  for (const line of lines.slice(firstProseIndex)) {
    if (line === '' || NON_PROSE_LINE_PATTERN.test(line)) {
      break;
    }
    paragraphLines.push(line);
  }
  return paragraphLines.join(' ');
}

function stripInlineMarkdown(paragraph: string): string {
  return paragraph
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortenToDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAXIMUM_LENGTH) {
    return text;
  }
  const cut = text.slice(0, DESCRIPTION_MAXIMUM_LENGTH - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}
