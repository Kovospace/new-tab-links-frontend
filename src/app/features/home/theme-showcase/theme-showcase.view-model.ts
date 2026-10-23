import { Injectable, computed, signal } from '@angular/core';

/** Where the divider starts: halfway, so a first glance shows both themes side by side. */
export const INITIAL_DIVIDER_POSITION_PERCENT = 50;

/** Width of the screenshots' density-1 files, in image pixels; their 3x is 3840x2400. */
export const THEME_SHOWCASE_WIDTH_PIXELS = 1280;

/** Height of the screenshots' density-1 files; with the width, the 16:10 both share. */
export const THEME_SHOWCASE_HEIGHT_PIXELS = 800;

/**
 * State behind the light-and-dark comparison on the home page.
 *
 * <p>The light screenshot lies underneath, whole; the dark one lies on top of it and is clipped
 * away left of a divider the reader drags. All the view-model holds is where that divider is, as
 * a percentage of the width, and the two style values that follow from it — a template must not
 * build either string itself.</p>
 */
@Injectable()
export class ThemeShowcaseViewModel {
  /** Where the divider is, from 0 (all dark) to 100 (all light), as a percentage of the width. */
  readonly dividerPositionPercent = signal<number>(INITIAL_DIVIDER_POSITION_PERCENT);

  /** The dark screenshot's {@code clip-path}: it shows only right of the divider. */
  readonly darkScreenshotClipPath = computed<string>(
    () => `inset(0 0 0 ${this.dividerPositionPercent()}%)`,
  );

  /** The divider line's {@code left}, so it sits exactly on the edge of the clipped screenshot. */
  readonly dividerLeft = computed<string>(() => `${this.dividerPositionPercent()}%`);

  /**
   * Moves the divider to where the reader dragged the slider.
   *
   * <p>Clamped rather than trusted: the range input already bounds it, but a value from anywhere
   * else must not push the clip outside the picture.</p>
   *
   * @param positionPercent the slider's value, 0 to 100
   */
  moveDivider(positionPercent: number): void {
    const boundedPosition = Math.min(100, Math.max(0, positionPercent));
    this.dividerPositionPercent.set(
      Number.isFinite(boundedPosition) ? boundedPosition : INITIAL_DIVIDER_POSITION_PERCENT,
    );
  }
}
