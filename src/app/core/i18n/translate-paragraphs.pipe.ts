import { ChangeDetectorRef, Pipe, PipeTransform, effect, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Renders a translation key as the paragraphs it should be shown in.
 *
 * <p>The companion to {@link TranslatePipe}, for the one case that pipe cannot serve: a
 * translation authored as an array of strings because the text needs more than one paragraph.
 * How many paragraphs a thought takes differs by language — the English blurb that fits in a
 * sentence may need two in Slovak — so it is the translation file's decision, not the
 * template's, and this is what lets a template honour it without knowing which form was used.
 * A plain string arrives as a single paragraph, so a template written against this works for
 * both and keeps working when a translator changes their mind.</p>
 *
 * <p>Impure for exactly the reasons {@link TranslatePipe} is; its Javadoc explains them, and the
 * same effect marks the host view dirty when the language changes.</p>
 *
 * @example
 * ```html
 * @for (paragraph of 'home.features.workspacesText' | translateParagraphs; track paragraph) {
 *   <p>{{ paragraph }}</p>
 * }
 * ```
 */
@Pipe({ name: 'translateParagraphs', pure: false })
export class TranslateParagraphsPipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);
  private readonly hostViewChangeDetector = inject(ChangeDetectorRef);

  /**
   * Marks the host view for checking whenever the active language changes.
   *
   * <p>Without this, paragraphs already rendered would keep their old wording — and their old
   * count, which is the more visible half of the bug — until something unrelated re-checked the
   * view.</p>
   */
  private readonly rerenderOnLanguageChange = effect(() => {
    this.translationService.currentLanguageCode();
    this.hostViewChangeDetector.markForCheck();
  });

  /**
   * Translates one key into its paragraphs.
   *
   * @param translationKey    dotted path into the translation file
   * @param placeholderValues values for any {@code {placeholder}} markers, applied per paragraph
   * @returns one entry per paragraph, or the key itself when it is not translated
   */
  transform(
    translationKey: string,
    placeholderValues?: Readonly<Record<string, string | number>>,
  ): readonly string[] {
    return this.translationService.translateToParagraphs(translationKey, placeholderValues);
  }
}
