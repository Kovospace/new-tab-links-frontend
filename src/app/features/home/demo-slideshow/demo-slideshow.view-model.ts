import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  DemoSlideFiles,
  DemoSlidesIndex,
  DemoSlidesService,
} from '../../../core/demo/demo-slides.service';
import { buildLocalizedImageUrl } from '../../../core/i18n/localized-image.pipe';
import { ImageVersionStore } from '../../../core/images/image-version.store';
import {
  DEFAULT_LANGUAGE_CODE,
  SupportedLanguageCode,
} from '../../../core/i18n/supported-language';
import { TranslationService } from '../../../core/i18n/translation.service';

/** How long one screenshot stays on screen before the next replaces it. */
export const DEMO_SLIDE_DURATION_MILLISECONDS = 5_000;

/** Folder below {@code images/<language>/} the screenshots live in. */
const DEMO_IMAGE_FOLDER = 'demo';

/** Width of a slide on the page, in CSS pixels, and of its density-1 file in image pixels. */
export const DEMO_SLIDE_WIDTH_PIXELS = 1280;

/** Height of a slide on the page, in CSS pixels; with the width, the 16:10 every slide shares. */
export const DEMO_SLIDE_HEIGHT_PIXELS = 800;

/**
 * How wide the slide is drawn, for the browser to pick a file before layout: 1280 pixels where the
 * page leaves room for it (the breakpoint in {@code demo-slideshow.scss}), the viewport's width
 * below that.
 */
const DEMO_SLIDE_SIZES = `(min-width: 1440px) ${DEMO_SLIDE_WIDTH_PIXELS}px, 100vw`;

/**
 * One screenshot of the slideshow and the dot that selects it, ready to render.
 */
export interface PresentedDemoSlide {
  /** Where the screenshot is served from, in the reader's language, at its 1280x800 size. */
  readonly imageUrl: string;
  /**
   * Every density of the screenshot with its width in image pixels, as an {@code srcset}.
   *
   * <p>Widths rather than {@code 1x}/{@code 2x}/{@code 3x}, deliberately: a phone with a 3x screen
   * draws the slide about 400 CSS pixels wide, so 1280 image pixels are plenty, and a density
   * descriptor would send it the 3840-pixel file anyway. With widths and {@link imageSizes} the
   * browser picks the smallest file that is sharp at the size actually drawn.</p>
   */
  readonly imageSourceSet: string;
  /** How wide the screenshot is drawn, as {@code sizes}, so the browser can choose from the set. */
  readonly imageSizes: string;
  /** What the screenshot is, for a reader who cannot see it. */
  readonly imageAlternativeText: string;
  /** What the dot does, for a reader who cannot see it. */
  readonly dotLabel: string;
  /** Whether this is the screenshot on screen now. */
  readonly isActive: boolean;
  /**
   * Whether assistive technology should skip it: every screenshot is in the page, side by side,
   * but only the one in view is being shown.
   */
  readonly isHiddenFromAssistiveTechnology: boolean;
}

/**
 * State behind the demo slideshow on the home page.
 *
 * <p>The screenshots are the numbered images in {@code public/images/<language>/demo/}, listed at
 * build time. A reader whose language has none yet is shown the English ones, which beats an empty
 * space where the demo should be.</p>
 *
 * <p>Every screenshot is rendered at once, side by side on one track, and the track slides so
 * that the active one is in view. That is also why no switch waits on a download: the browser has
 * fetched them all by the time the slideshow moves on.</p>
 *
 * <p>Picking a dot restarts the ten seconds rather than keeping to the old schedule: a reader who
 * just chose a screenshot should get the whole interval to look at it.</p>
 */
@Injectable()
export class DemoSlideshowViewModel {
  private readonly demoSlidesService = inject(DemoSlidesService);
  private readonly translationService = inject(TranslationService);
  private readonly imageVersionStore = inject(ImageVersionStore);
  private readonly destroyRef = inject(DestroyRef);

  /** The list as loaded; empty until it arrives, and if it never does. */
  private readonly loadedDemoSlidesIndex = signal<DemoSlidesIndex>({});

  /** Position of the screenshot on screen, among {@link presentedSlides}. */
  private readonly activeSlidePosition = signal<number>(0);

  /** The timer moving to the next screenshot, while one is running. */
  private advanceTimerHandle: ReturnType<typeof setInterval> | null = null;

  /** The language whose screenshots are shown: the reader's, or English when it has none. */
  private readonly slidesLanguageCode = computed<SupportedLanguageCode>(() => {
    const readerLanguageCode = this.translationService.currentLanguageCode();
    return this.loadedDemoSlidesIndex()[readerLanguageCode]?.length
      ? readerLanguageCode
      : DEFAULT_LANGUAGE_CODE;
  });

  /** The screenshots' files, in the order they are shown. */
  private readonly demoSlides = computed<readonly DemoSlideFiles[]>(
    () => this.loadedDemoSlidesIndex()[this.slidesLanguageCode()] ?? [],
  );

  /** Every screenshot, each marked whether it is the one on screen. */
  readonly presentedSlides = computed<readonly PresentedDemoSlide[]>(() => {
    const demoSlides = this.demoSlides();
    const activeSlidePosition = this.activeSlidePosition() % Math.max(demoSlides.length, 1);

    return demoSlides.map((slideFiles, slidePosition) =>
      this.presentSlide(slideFiles, slidePosition, demoSlides.length, activeSlidePosition),
    );
  });

  /**
   * How far the track is slid to bring the active screenshot into view: one image width per
   * screenshot before it, as a CSS {@code transform}.
   */
  readonly trackTransform = computed<string>(() => {
    const activeSlidePosition = this.presentedSlides().findIndex((slide) => slide.isActive);
    return `translateX(${-100 * Math.max(activeSlidePosition, 0)}%)`;
  });

  /** Width every slide is laid out at, so the page reserves its space before the image arrives. */
  readonly slideWidthPixels = DEMO_SLIDE_WIDTH_PIXELS;

  /** Height every slide is laid out at; with the width, the aspect ratio the image is drawn in. */
  readonly slideHeightPixels = DEMO_SLIDE_HEIGHT_PIXELS;

  /** Whether there is anything to choose between, and so any dots to show. */
  readonly hasSeveralSlides = computed<boolean>(() => this.demoSlides().length > 1);

  /** Label of the slideshow as a whole. */
  readonly slideshowLabel = computed<string>(() =>
    this.translationService.translate('home.demo.slideshowLabel'),
  );

  /**
   * Loads the list of screenshots and starts moving through them.
   *
   * <p>A list that fails to load leaves the section empty rather than showing an error: the demo
   * illustrates the page, and the page reads perfectly well without it.</p>
   */
  startSlideshow(): void {
    this.demoSlidesService.loadDemoSlidesIndex().subscribe({
      next: (demoSlidesIndex) => this.loadedDemoSlidesIndex.set(demoSlidesIndex),
      error: () => this.loadedDemoSlidesIndex.set({}),
    });
    this.restartAdvanceTimer();
    this.destroyRef.onDestroy(() => this.stopAdvanceTimer());
  }

  /**
   * Shows the screenshot a dot was clicked for, and gives it a full interval on screen.
   *
   * @param slidePosition position of the screenshot, as {@link presentedSlides} lists it
   */
  showSlide(slidePosition: number): void {
    this.activeSlidePosition.set(slidePosition);
    this.restartAdvanceTimer();
  }

  /**
   * Moves to the next screenshot, back to the first after the last.
   */
  private showNextSlide(): void {
    const slideCount = this.demoSlides().length;
    if (slideCount > 1) {
      this.activeSlidePosition.update((slidePosition) => (slidePosition + 1) % slideCount);
    }
  }

  /**
   * (Re)starts the interval after which the next screenshot is shown.
   */
  private restartAdvanceTimer(): void {
    this.stopAdvanceTimer();
    this.advanceTimerHandle = setInterval(
      () => this.showNextSlide(),
      DEMO_SLIDE_DURATION_MILLISECONDS,
    );
  }

  /**
   * Stops the interval, when the page is left or before starting a new one.
   */
  private stopAdvanceTimer(): void {
    if (this.advanceTimerHandle !== null) {
      clearInterval(this.advanceTimerHandle);
      this.advanceTimerHandle = null;
    }
  }

  /**
   * Words one screenshot and its dot.
   *
   * @param slideFiles          the screenshot's files below the demo folder, by density
   * @param slidePosition       its position in the slideshow, from zero
   * @param slideCount          how many screenshots there are
   * @param activeSlidePosition position of the one on screen now
   * @returns the screenshot, ready to render
   */
  private presentSlide(
    slideFiles: DemoSlideFiles,
    slidePosition: number,
    slideCount: number,
    activeSlidePosition: number,
  ): PresentedDemoSlide {
    const placeholderValues = { number: slidePosition + 1, count: slideCount };

    const filesByDensity = Object.entries(slideFiles)
      .flatMap(([density, fileName]) => (fileName ? [{ density: Number(density), fileName }] : []))
      .sort((first, second) => first.density - second.density);

    return {
      imageUrl: this.demoImageUrl(filesByDensity[0]?.fileName ?? ''),
      imageSourceSet: filesByDensity
        .map(
          ({ density, fileName }) =>
            `${this.demoImageUrl(fileName)} ${density * DEMO_SLIDE_WIDTH_PIXELS}w`,
        )
        .join(', '),
      imageSizes: DEMO_SLIDE_SIZES,
      imageAlternativeText: this.translationService.translate(
        'home.demo.slideAlternativeText',
        placeholderValues,
      ),
      dotLabel: this.translationService.translate('home.demo.showSlide', placeholderValues),
      isActive: slidePosition === activeSlidePosition,
      isHiddenFromAssistiveTechnology: slidePosition !== activeSlidePosition,
    };
  }

  /**
   * Where one of the screenshots' files is served from.
   *
   * @param fileName the file's name below the demo folder
   * @returns its URL, in the language whose screenshots are shown, carrying its version
   */
  private demoImageUrl(fileName: string): string {
    return this.imageVersionStore.versionImageUrl(
      buildLocalizedImageUrl(`${DEMO_IMAGE_FOLDER}/${fileName}`, this.slidesLanguageCode()),
    );
  }
}
