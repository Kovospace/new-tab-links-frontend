import { Injectable, computed, signal } from '@angular/core';

/** Where the divider starts: halfway, so a first glance shows both themes side by side. */
export const INITIAL_DIVIDER_POSITION_PERCENT = 50;

/** Width of the screenshots' density-1 files, in image pixels; their 3x is 3840x2400. */
export const THEME_SHOWCASE_WIDTH_PIXELS = 1280;

/** Height of the screenshots' density-1 files; with the width, the 16:10 both share. */
export const THEME_SHOWCASE_HEIGHT_PIXELS = 800;

/** One screen of the new tab, photographed in both themes. */
export interface ThemeShowcaseScreen {
  /** Number the reader picks it by, starting at 1; also the prefix of its files. */
  readonly screenNumber: number;

  /** Path of the light screenshot's 1x copy below the language folder. */
  readonly lightScreenshotPath: string;

  /** Path of the dark screenshot's 1x copy below the language folder. */
  readonly darkScreenshotPath: string;
}

/**
 * The screens the reader can switch between, in the order of their buttons. Each is a pair of
 * {@code theme-showcase/<n>-light} and {@code <n>-dark} screenshots in every language folder, made
 * from one _3x export each by the image-maintenance tool.
 */
export const THEME_SHOWCASE_SCREENS: readonly ThemeShowcaseScreen[] = [
  {
    screenNumber: 1,
    lightScreenshotPath: 'theme-showcase/1-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/1-dark_1x.webp',
  },
  {
    screenNumber: 2,
    lightScreenshotPath: 'theme-showcase/2-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/2-dark_1x.webp',
  },
  {
    screenNumber: 3,
    lightScreenshotPath: 'theme-showcase/3-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/3-dark_1x.webp',
  },
  {
    screenNumber: 4,
    lightScreenshotPath: 'theme-showcase/4-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/4-dark_1x.webp',
  },
  {
    screenNumber: 5,
    lightScreenshotPath: 'theme-showcase/5-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/5-dark_1x.webp',
  },
  {
    screenNumber: 6,
    lightScreenshotPath: 'theme-showcase/6-light_1x.webp',
    darkScreenshotPath: 'theme-showcase/6-dark_1x.webp',
  },
];

/**
 * State behind the light-and-dark comparison on the home page.
 *
 * <p>The light screenshot lies underneath, whole; the dark one lies on top of it and is clipped
 * away left of a divider the reader drags. All the view-model holds is where that divider is, as
 * a percentage of the width, and the two style values that follow from it — a template must not
 * build either string itself.</p>
 *
 * <p>It also holds which screen the pair shows. Switching screens keeps the divider where it is,
 * so the reader compares the next screen at the same place.</p>
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

  /** Every screen there is to switch to, one button each. */
  readonly screens = THEME_SHOWCASE_SCREENS;

  /** The screen whose two screenshots are shown. */
  readonly shownScreen = signal<ThemeShowcaseScreen>(THEME_SHOWCASE_SCREENS[0]);

  /**
   * Shows the screen the reader picked.
   *
   * @param screen one of {@link screens}
   */
  showScreen(screen: ThemeShowcaseScreen): void {
    this.shownScreen.set(screen);
  }

  /**
   * Whether a screen is the one shown, for its button to say it is pressed.
   *
   * @param screen one of {@link screens}
   * @returns true for the shown screen
   */
  isScreenShown(screen: ThemeShowcaseScreen): boolean {
    return this.shownScreen() === screen;
  }

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
