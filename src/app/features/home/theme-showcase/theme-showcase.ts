import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LocalizedImageSrcsetPipe } from '../../../core/i18n/localized-image-srcset.pipe';
import { LocalizedImagePipe } from '../../../core/i18n/localized-image.pipe';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  THEME_SHOWCASE_HEIGHT_PIXELS,
  THEME_SHOWCASE_WIDTH_PIXELS,
  ThemeShowcaseViewModel,
} from './theme-showcase.view-model';

/**
 * The same new tab in the light and the dark theme, one over the other, with a divider the reader
 * drags to compare them.
 *
 * <p>The dragging is an invisible range input stretched over the whole picture, so it works with a
 * mouse, a finger and the arrow keys, and announces itself to a screen reader, without a line of
 * pointer handling here.</p>
 */
@Component({
  selector: 'app-theme-showcase',
  imports: [TranslatePipe, LocalizedImagePipe, LocalizedImageSrcsetPipe],
  providers: [ThemeShowcaseViewModel],
  templateUrl: './theme-showcase.html',
  styleUrl: './theme-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeShowcase {
  /** State of the comparison. */
  protected readonly viewModel = inject(ThemeShowcaseViewModel);

  /** Width of the screenshots, for the browser to reserve their space before they load. */
  protected readonly screenshotWidthPixels = THEME_SHOWCASE_WIDTH_PIXELS;

  /** Height of the screenshots, for the same reason. */
  protected readonly screenshotHeightPixels = THEME_SHOWCASE_HEIGHT_PIXELS;

  /**
   * Hands the slider's new value to the view-model.
   *
   * @param inputEvent the range input's {@code input} event
   */
  protected onSliderInput(inputEvent: Event): void {
    this.viewModel.moveDivider((inputEvent.target as HTMLInputElement).valueAsNumber);
  }
}
