import { Lexer, Token, Tokens } from 'marked';
import { ImagePlacement, readImagePlacement } from '../content/site-markdown-renderer';

/** One home page point's markdown, its picture lifted out to be laid out beside the text. */
export interface SeparatedHomeFeatureMarkdown {
  /** The picture, as markdown of its own; empty when the point has none. */
  readonly pictureMarkdown: string;
  /** Everything else in the file, exactly as written. */
  readonly textMarkdown: string;
  /**
   * The side the picture asked for with {@code #left} or {@code #right}, taken off its address so
   * it is not floated as well; {@code null} when it asked for none.
   */
  readonly picturePlacement: ImagePlacement | null;
}

/**
 * Lifts a home page point's picture out of its markdown, so the page can draw it on one side and
 * the text on the other.
 *
 * <p>The picture is the first image that stands as a paragraph of its own, wherever it is in the
 * file — above the {@code #} title or below it. Splitting the file here, rather than writing the
 * picture's address somewhere else, keeps a point one markdown file that previews as a whole in an
 * editor, and lets the file move its picture without the page changing.</p>
 *
 * <p>An image inside a sentence, or after the picture, stays in the text.</p>
 *
 * @param markdown the point's markdown
 * @returns the picture and the text, or the whole file as text when there is no picture
 */
export function separateHomeFeaturePicture(markdown: string): SeparatedHomeFeatureMarkdown {
  const picture = new Lexer().lex(markdown).map(standaloneImageOf).find(isPresent);
  if (picture === undefined) {
    return { pictureMarkdown: '', textMarkdown: markdown, picturePlacement: null };
  }
  const { address, placement } = readImagePlacement(picture.image.href);
  const pictureStart = markdown.indexOf(picture.paragraphRaw);
  return {
    pictureMarkdown: picture.paragraphRaw.replace(picture.image.href, address).trim(),
    // The blank lines that separated the picture from what followed go with it.
    textMarkdown:
      markdown.slice(0, pictureStart) +
      markdown.slice(pictureStart + picture.paragraphRaw.length).replace(/^\n+/, ''),
    picturePlacement: placement,
  };
}

/** An image standing alone as a paragraph, with the paragraph's source. */
interface StandaloneImage {
  readonly paragraphRaw: string;
  readonly image: Tokens.Image;
}

/**
 * The image a top-level token is, if it is a paragraph holding nothing but one image.
 *
 * @param token a top-level token of the point's markdown
 * @returns the image and its paragraph's source, or {@code null}
 */
function standaloneImageOf(token: Token): StandaloneImage | null {
  if (token.type !== 'paragraph') {
    return null;
  }
  const inlineTokens = ((token as Tokens.Paragraph).tokens ?? []).filter(
    (inline) => !(inline.type === 'text' && inline.raw.trim() === ''),
  );
  if (inlineTokens.length !== 1 || inlineTokens[0].type !== 'image') {
    return null;
  }
  return { paragraphRaw: token.raw, image: inlineTokens[0] as Tokens.Image };
}

/**
 * Narrows away the tokens that were not a standalone image.
 *
 * @param image an image, or {@code null}
 * @returns true for an image
 */
function isPresent(image: StandaloneImage | null): image is StandaloneImage {
  return image !== null;
}
