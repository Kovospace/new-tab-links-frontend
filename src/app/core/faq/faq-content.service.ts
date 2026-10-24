import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { LocalizedMarkdownService } from '../content/localized-markdown.service';
import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { SupportedLanguageCode } from '../i18n/supported-language';
import { ImageVersionStore } from '../images/image-version.store';
import { FaqEntry, readFaqEntries } from './faq-entries';

/** Where the FAQ's markdown is served from; it ships in {@code public/content/faq}. */
const FAQ_CONTENT_ROOT = '/content/faq';

/** The FAQ's file within each language's folder. */
const FAQ_FILE_NAME = 'faq.md';

/** The folder below {@code /images/<language>/} the FAQ's relatively named images live in. */
const FAQ_IMAGE_FOLDER = 'faq';

/** The FAQ, ready for both of its readers. */
export interface LoadedFaq {
  /** The whole FAQ as HTML, for the page; its {@code #} title is the page's {@code <h1>}. */
  readonly html: string;
  /** The questions and plain-text answers, for the page's structured data. */
  readonly entries: readonly FaqEntry[];
  /** The language the FAQ was actually found in, which is English until it is translated. */
  readonly languageCode: SupportedLanguageCode;
}

/**
 * The FAQ's written content: one markdown file per language, each {@code ##} heading a question.
 */
@Injectable({ providedIn: 'root' })
export class FaqContentService {
  private readonly localizedMarkdownService = inject(LocalizedMarkdownService);
  private readonly imageVersionStore = inject(ImageVersionStore);

  /**
   * Fetches the FAQ in the reader's language, or in English until it is translated.
   *
   * @param languageCode the reader's language
   * @returns the FAQ rendered, and read back into questions and answers
   */
  loadFaq(languageCode: SupportedLanguageCode): Observable<LoadedFaq> {
    return this.localizedMarkdownService
      .loadMarkdown(FAQ_CONTENT_ROOT, FAQ_FILE_NAME, languageCode)
      .pipe(
        map((loaded) => ({
          html: renderSiteMarkdown(loaded.markdown, {
            languageCode: loaded.languageCode,
            imageFolder: FAQ_IMAGE_FOLDER,
            markdownFolder: `${FAQ_CONTENT_ROOT}/${loaded.languageCode}`,
            versionImageUrl: this.imageVersionStore.versionImageUrl,
          }),
          entries: readFaqEntries(loaded.markdown),
          languageCode: loaded.languageCode,
        })),
      );
  }
}
