/** One question of the FAQ, with its answer as a search engine reads it. */
export interface FaqEntry {
  /** The question, as its {@code ##} heading spells it. */
  readonly question: string;
  /** The answer as plain text: the words a reader sees, without markdown or link addresses. */
  readonly answer: string;
}

/**
 * Reads the questions and answers out of the FAQ's markdown.
 *
 * <p>The FAQ is one markdown file, written like every other piece of content, where each
 * {@code ##} heading is a question and everything up to the next one is its answer. Reading it
 * back into pairs is what lets the page describe itself to search engines as an {@code FAQPage}
 * without the questions being written a second time somewhere else.</p>
 *
 * <p>The answer keeps only what a reader sees: a link's text stays and its address goes, images
 * go, emphasis and list markers go. A question with no answer under it is skipped, because a
 * search engine would refuse the whole page over one empty answer.</p>
 *
 * @param markdown the FAQ's markdown
 * @returns the questions in the order they are written
 */
export function readFaqEntries(markdown: string): readonly FaqEntry[] {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [headingLine, ...answerLines] = section.split('\n');
      return {
        question: headingLine.trim(),
        answer: toPlainAnswerText(answerLines.join('\n')),
      };
    })
    .filter((entry) => entry.question.length > 0 && entry.answer.length > 0);
}

/**
 * Turns an answer's markdown into the plain text a reader sees.
 *
 * @param answerMarkdown everything under one question's heading
 * @returns the answer as one line of plain text
 */
function toPlainAnswerText(answerMarkdown: string): string {
  return answerMarkdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*(?:#+|[-*+]|\d+\.|>)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
