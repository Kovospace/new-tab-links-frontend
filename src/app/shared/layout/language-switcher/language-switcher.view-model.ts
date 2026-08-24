import { Injectable, computed, inject } from '@angular/core';
import { SupportedLanguageCode } from '../../../core/i18n/supported-language';
import { TranslationService } from '../../../core/i18n/translation.service';

/**
 * One language the reader can switch to, ready to render.
 */
export interface LanguageOption {
  /** The language's code, used as the option's value. */
  readonly languageCode: SupportedLanguageCode;
  /** The language's name, written in that language. */
  readonly languageName: string;
  /** Whether this is the language currently displayed. */
  readonly isActive: boolean;
}

/**
 * State and behaviour behind the language switcher.
 *
 * <p>Each option's name is looked up here rather than in the template, because the name is data
 * derived from the translation dictionary, not a fixed label.</p>
 */
@Injectable()
export class LanguageSwitcherViewModel {
  private readonly translationService = inject(TranslationService);

  /** Every language on offer, the active one marked. */
  readonly languageOptions = computed<readonly LanguageOption[]>(() =>
    this.translationService.availableLanguageCodes().map((languageCode) => ({
      languageCode,
      languageName: this.translationService.translate(`language.${languageCode}`),
      isActive: languageCode === this.translationService.currentLanguageCode(),
    })),
  );

  /** The language currently displayed, bound as the select's value. */
  readonly activeLanguageCode = this.translationService.currentLanguageCode;

  /** Label of the switcher itself, translated. */
  readonly switcherLabel = computed<string>(() =>
    this.translationService.translate('language.switchLabel'),
  );

  /**
   * Switches the page to another language.
   *
   * @param languageCode the language the reader picked
   */
  changeLanguage(languageCode: SupportedLanguageCode): void {
    void this.translationService.changeLanguage(languageCode);
  }
}
