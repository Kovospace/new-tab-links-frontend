import { ChangeDetectorRef, Pipe, PipeTransform, effect, inject } from '@angular/core';
import { ImageUrlVersioner, ImageVersionStore } from '../images/image-version.store';
import { buildLocalizedImageUrl } from './localized-image.pipe';
import { SupportedLanguageCode } from './supported-language';
import { TranslationService } from './translation.service';

/**
 * A path naming the 1x copy of a set of densities: {@code <name>_1x.<ext>}. The _2x and _3x copies
 * sit beside it under the same name — the image-maintenance tool derives all three from one _3x
 * export, exactly as it does for the markdown images and the demo slides.
 */
const SINGLE_DENSITY_IMAGE_PATH = /^(.*)_1x(\.[^./]+)$/;

/** The densities every retina set is exported in. */
const IMAGE_DENSITIES = [1, 2, 3] as const;

/**
 * Builds the density {@code srcset} of one image in a given language.
 *
 * <p>A path that does not name a {@code _1x} copy has no siblings to offer, so it yields an empty
 * {@code srcset}, which the browser ignores in favour of {@code src}.</p>
 *
 * @param imagePath    path of the 1x copy below the language folder, such as
 *                     {@code install/standart-login-menu_1x.webp}
 * @param languageCode language whose folder to take the copies from
 * @param versionImageUrl gives each copy's address its version, which each copy has of its own
 * @returns the {@code srcset} naming the 1x, 2x and 3x copies
 */
export function buildLocalizedImageSrcset(
  imagePath: string,
  languageCode: SupportedLanguageCode,
  versionImageUrl: ImageUrlVersioner,
): string {
  const singleDensity = SINGLE_DENSITY_IMAGE_PATH.exec(imagePath);
  if (singleDensity === null) {
    return '';
  }
  const [, stem, extension] = singleDensity;

  return IMAGE_DENSITIES.map((density) => {
    const copyUrl = buildLocalizedImageUrl(`${stem}_${density}x${extension}`, languageCode);
    return `${versionImageUrl(copyUrl)} ${density}x`;
  }).join(', ');
}

/**
 * Renders the path of an image's 1x copy as a density {@code srcset} in the active language, so a
 * retina display loads the sharper copy of a screenshot.
 *
 * <p>The companion of {@code LocalizedImagePipe}, which still supplies {@code src} from the same
 * path: a browser that ignores {@code srcset} gets the 1x copy.</p>
 *
 * <p>Impure, with an effect marking the view for checking, for the reason {@code LocalizedImagePipe}
 * documents: its argument never changes, and a pure pipe would keep the first language's
 * copies after a language switch.</p>
 *
 * @example
 * ```html
 * <img
 *   [src]="'install/standart-login-menu_1x.webp' | localizedImage"
 *   [srcset]="'install/standart-login-menu_1x.webp' | localizedImageSrcset"
 *   [alt]="'download.pairAction.standartLoginMenuAlt' | translate"
 * />
 * ```
 */
@Pipe({ name: 'localizedImageSrcset', pure: false })
export class LocalizedImageSrcsetPipe implements PipeTransform {
  private readonly translationService = inject(TranslationService);
  private readonly imageVersionStore = inject(ImageVersionStore);
  private readonly hostViewChangeDetector = inject(ChangeDetectorRef);

  /** Marks the host view for checking whenever the active language changes. */
  private readonly rerenderOnLanguageChange = effect(() => {
    this.translationService.currentLanguageCode();
    this.hostViewChangeDetector.markForCheck();
  });

  /**
   * Resolves the densities of one image against the active language.
   *
   * @param imagePath path of the 1x copy below the language folder
   * @returns the {@code srcset} of that image in the language now being displayed
   */
  transform(imagePath: string): string {
    return buildLocalizedImageSrcset(
      imagePath,
      this.translationService.currentLanguageCode(),
      this.imageVersionStore.versionImageUrl,
    );
  }
}
