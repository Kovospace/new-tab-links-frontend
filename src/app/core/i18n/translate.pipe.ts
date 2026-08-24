import { ChangeDetectorRef, Pipe, PipeTransform, effect, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Renders a translation key as the text of the active language.
 *
 * <p>This is the one transformation a template of this project is allowed to perform. Looking
 * every static label up through a view-model would put a member on every view-model for every
 * word on the page and gain nothing; the project's rule bans transformation of <em>data</em>,
 * and a translation key is not data but the label itself.</p>
 *
 * <p>Anything that depends on loaded data — a formatted date, a device state, a backend error —
 * is translated in the view-model instead, and reaches the template already worded.</p>
 *
 * <h2>Why this pipe is impure</h2>
 *
 * <p>Its input never changes: {@code 'nav.home'} is the same string forever. Angular caches a
 * <em>pure</em> pipe's result against its arguments and skips the call when they are unchanged,
 * so a pure pipe would evaluate once, never read the translation signal again, and leave the
 * page in the language it first loaded. Being impure is what makes a language switch reach text
 * that is already on screen. The work per call is one {@code Map} lookup.</p>
 *
 * <p>Impurity alone is not enough under zoneless change detection: a view is only re-checked
 * when something marks it dirty, and a language change happens outside it. The effect below is
 * that missing half — it marks the host view dirty whenever the active language changes.</p>
 *
 * @example
 * ```html
 * <h1>{{ 'home.heading' | translate }}</h1>
 * <p>{{ 'footer.copyrightNotice' | translate: copyrightPlaceholders() }}</p>
 * ```
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);
  private readonly hostViewChangeDetector = inject(ChangeDetectorRef);

  /**
   * Marks the host view for checking whenever the active language changes.
   *
   * <p>Without this, text already rendered would keep its old wording until something unrelated
   * happened to re-check the view.</p>
   */
  private readonly rerenderOnLanguageChange = effect(() => {
    this.translationService.currentLanguageCode();
    this.hostViewChangeDetector.markForCheck();
  });

  /**
   * Translates one key.
   *
   * @param translationKey    dotted path into the translation file
   * @param placeholderValues values for any {@code {placeholder}} markers in the string
   * @returns the translated text, or the key itself when it is not translated
   */
  transform(
    translationKey: string,
    placeholderValues?: Readonly<Record<string, string | number>>,
  ): string {
    return this.translationService.translate(translationKey, placeholderValues);
  }
}
