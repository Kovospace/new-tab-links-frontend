import { Injectable, computed, inject } from '@angular/core';
import { SupportedLanguageCode } from '../../../core/i18n/supported-language';
import { TranslationService } from '../../../core/i18n/translation.service';

/**
 * Where the flag images live, relative to the site root.
 *
 * <p>Served straight from {@code public/}, which the build copies verbatim, and cached for a week
 * by the nginx rule that already covers {@code .png}.</p>
 *
 * <p>The artwork is the official 1:1 flag from <em>lipis/flag-icons</em> (MIT; the flags
 * themselves are public domain), rasterised from its 512&times;512 SVG. To add a language, or to
 * add a density, regenerate with:</p>
 *
 * <pre>
 * curl -sfL https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/1x1/&lt;iso&gt;.svg -o flag.svg
 * magick -background none flag.svg -resize 48x48 -strip public/flags/&lt;code&gt;-48.png
 * </pre>
 */
const FLAG_IMAGE_DIRECTORY = '/flags';

/**
 * Width, in CSS pixels, the flag is laid out at.
 *
 * <p>48 is not arbitrary: it is the smallest target size that is comfortable to hit on a phone,
 * and it is the width of the 1&times; image, so the densities below mean exactly what they say.
 * The stylesheet draws the flag at this same size — change one and the other has to follow.</p>
 */
const FLAG_IMAGE_WIDTH_IN_PIXELS = 48;

/**
 * The screen densities the flags are rasterised for.
 *
 * <p>A phone at 3&times; would otherwise be handed a 48px image and stretch it. Listing all three
 * lets the browser pick, and download, only the one it will actually draw.</p>
 */
const FLAG_IMAGE_DENSITIES: readonly number[] = [1, 2, 3];

/**
 * Builds the address of one flag file.
 *
 * @param languageCode  language the flag belongs to
 * @param widthInPixels which rasterisation is wanted
 * @returns the path to that file
 */
function buildFlagImageUrl(languageCode: SupportedLanguageCode, widthInPixels: number): string {
  return `${FLAG_IMAGE_DIRECTORY}/${languageCode}-${widthInPixels}.png`;
}

/**
 * Builds the {@code srcset} offering every density of one language's flag.
 *
 * @param languageCode language the flag belongs to
 * @returns a srcset naming each file against the density it is meant for
 */
function buildFlagImageSourceSet(languageCode: SupportedLanguageCode): string {
  return FLAG_IMAGE_DENSITIES.map(
    (density) =>
      `${buildFlagImageUrl(languageCode, FLAG_IMAGE_WIDTH_IN_PIXELS * density)} ${density}x`,
  ).join(', ');
}

/**
 * One language the reader can switch to, ready to render.
 */
export interface LanguageOption {
  /** The language's code, used to identify the choice. */
  readonly languageCode: SupportedLanguageCode;
  /** The language's name, written in that language. */
  readonly languageName: string;
  /**
   * The flag shown for this language, at its laid-out size.
   *
   * <p>Built here rather than in the template, because assembling a path from a code is exactly
   * the kind of transformation the template is not allowed to do. Used by browsers that do not
   * understand {@link flagImageSourceSet}.</p>
   */
  readonly flagImageUrl: string;

  /** The same flag at every screen density, for the browser to choose from. */
  readonly flagImageSourceSet: string;
  /** Whether this is the language currently displayed. */
  readonly isActive: boolean;
}

/**
 * State and behaviour behind the language switcher.
 *
 * <p>Each option's name is looked up here rather than in the template, because the name is data
 * derived from the translation dictionary, not a fixed label.</p>
 *
 * <p>The name is still produced even though the switcher shows only flags: a flag is a picture,
 * and a picture cannot name a control. It becomes the button's accessible name instead, so what
 * a screen reader announces is the language rather than "button".</p>
 */
@Injectable()
export class LanguageSwitcherViewModel {
  private readonly translationService = inject(TranslationService);

  /** Every language on offer, the active one marked. */
  readonly languageOptions = computed<readonly LanguageOption[]>(() =>
    this.translationService.availableLanguageCodes().map((languageCode) => ({
      languageCode,
      languageName: this.translationService.translate(`language.${languageCode}`),
      flagImageUrl: buildFlagImageUrl(languageCode, FLAG_IMAGE_WIDTH_IN_PIXELS),
      flagImageSourceSet: buildFlagImageSourceSet(languageCode),
      isActive: languageCode === this.translationService.currentLanguageCode(),
    })),
  );

  /** The language currently displayed, bound as the select's value. */
  readonly activeLanguageCode = this.translationService.currentLanguageCode;

  /**
   * Size the flag is drawn at, bound to the image's own attributes.
   *
   * <p>Present so the browser knows the shape of the image before it has loaded and leaves room
   * for it, instead of reflowing the header once it arrives.</p>
   */
  readonly flagImageWidthInPixels = FLAG_IMAGE_WIDTH_IN_PIXELS;

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
