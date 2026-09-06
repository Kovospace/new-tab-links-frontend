import { ChangeDetectorRef, Pipe, PipeTransform, effect, inject } from '@angular/core';
import { SupportedLanguageCode } from './supported-language';
import { TranslationService } from './translation.service';

/**
 * Folder under {@code public/} holding every localised image, one subfolder per language.
 *
 * <p>No leading slash: the URL is resolved against the document's {@code <base href>}, so the site
 * keeps working if it is ever served from something other than the root of a domain.</p>
 */
const LOCALIZED_IMAGE_ROOT = 'images';

/**
 * Builds the URL of one image in a given language.
 *
 * <p>The convention is that a language owns a whole folder and everything below it is named
 * identically: {@code images/en/install/my-devices-screen.png} and
 * {@code images/sk/install/my-devices-screen.png} are the same picture in two languages. That is
 * what lets a caller name the path once, without a per-language mapping table anywhere.</p>
 *
 * <p>Nothing verifies the file exists. A language missing an image gets a broken picture rather
 * than the English one — deliberately, because the alternative is a silent fetch of every image
 * twice, and a missing file is a mistake worth seeing during development.</p>
 *
 * @param imagePath    path below the language folder, such as {@code install/my-devices-screen.png}
 * @param languageCode language whose folder to take it from
 * @returns the URL to put in a {@code src}
 */
export function buildLocalizedImageUrl(
  imagePath: string,
  languageCode: SupportedLanguageCode,
): string {
  const pathBelowLanguage = imagePath.replace(/^\/+/, '');

  return `${LOCALIZED_IMAGE_ROOT}/${languageCode}/${pathBelowLanguage}`;
}

/**
 * Renders the path of an image as the URL of that image in the active language.
 *
 * <p>A screenshot of a translated interface is part of the translation. Putting the whole URL in
 * the translation files would work, but it would repeat the same path in every language file and
 * let the two drift; naming the path once and letting the language choose the folder cannot.</p>
 *
 * <p>The same reasoning as {@code TranslatePipe} applies to why this is a pipe rather than a
 * view-model member: an image path is not data the page loaded, it is the reference to the
 * picture, in the same way a translation key is the label.</p>
 *
 * <h2>Why this pipe is impure</h2>
 *
 * <p>Exactly the trap {@code TranslatePipe} documents. Its input never changes, so Angular would
 * cache a pure pipe's result against that argument, call it once, and leave a Slovak reader
 * looking at the English screenshot for as long as the page stayed open. The effect below is the
 * other half: under zoneless change detection an impure pipe is still only consulted when
 * something marks the view dirty, and a language change happens outside it.</p>
 *
 * @example
 * ```html
 * <img
 *   [src]="'install/my-devices-screen.png' | localizedImage"
 *   [alt]="'download.pairAction.devicesScreenshotAlt' | translate"
 * />
 * ```
 */
@Pipe({ name: 'localizedImage', pure: false })
export class LocalizedImagePipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);
  private readonly hostViewChangeDetector = inject(ChangeDetectorRef);

  /**
   * Marks the host view for checking whenever the active language changes.
   *
   * <p>Without this, an image already on screen would keep pointing at the previous language's
   * folder until something unrelated happened to re-check the view.</p>
   */
  private readonly rerenderOnLanguageChange = effect(() => {
    this.translationService.currentLanguageCode();
    this.hostViewChangeDetector.markForCheck();
  });

  /**
   * Resolves one image path against the active language.
   *
   * @param imagePath path below the language folder, such as
   *                  {@code install/my-devices-screen.png}
   * @returns the URL of that image in the language now being displayed
   */
  transform(imagePath: string): string {
    return buildLocalizedImageUrl(imagePath, this.translationService.currentLanguageCode());
  }
}
