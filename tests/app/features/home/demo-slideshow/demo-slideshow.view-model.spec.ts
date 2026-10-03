import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoSlidesIndex, DemoSlidesService } from '@app/core/demo/demo-slides.service';
import { TranslationService } from '@app/core/i18n/translation.service';
import {
  DEMO_SLIDE_DURATION_MILLISECONDS,
  DemoSlideshowViewModel,
} from '@app/features/home/demo-slideshow/demo-slideshow.view-model';

/**
 * The demo moves on by itself every ten seconds, a dot picks a screenshot by hand, and the
 * screenshots follow the reader's language.
 */
describe('DemoSlideshowViewModel', () => {
  const currentLanguageCode = signal<'en' | 'sk'>('en');
  let demoSlidesIndex: DemoSlidesIndex | Error;
  let viewModel: DemoSlideshowViewModel;

  /** Positions of the slides marked active — exactly one whenever there are slides. */
  function activeSlidePositions(): number[] {
    return viewModel
      .presentedSlides()
      .flatMap((presentedSlide, slidePosition) => (presentedSlide.isActive ? [slidePosition] : []));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    currentLanguageCode.set('en');
    demoSlidesIndex = {
      en: [{ '1': '1.webp' }, { '1': '2.webp' }, { '1': '3.webp' }],
      sk: [{ '1': '1.webp' }, { '1': '2.webp' }, { '1': '3.webp' }],
    };
    TestBed.configureTestingModule({
      providers: [
        DemoSlideshowViewModel,
        {
          provide: DemoSlidesService,
          useValue: {
            loadDemoSlidesIndex: () =>
              demoSlidesIndex instanceof Error
                ? throwError(() => demoSlidesIndex)
                : of(demoSlidesIndex),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode,
            translate: (key: string, values?: Record<string, string | number>) =>
              `${key} ${values?.['number'] ?? ''}/${values?.['count'] ?? ''}`,
          },
        },
      ],
    });
    viewModel = TestBed.inject(DemoSlideshowViewModel);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it("shows the reader's screenshots, starting with the first", () => {
    currentLanguageCode.set('sk');
    viewModel.startSlideshow();

    expect(viewModel.presentedSlides().map((slide) => slide.imageUrl)).toEqual([
      'images/sk/demo/1.webp',
      'images/sk/demo/2.webp',
      'images/sk/demo/3.webp',
    ]);
    expect(activeSlidePositions()).toEqual([0]);
    expect(viewModel.trackTransform()).toBe('translateX(0%)');
    expect(viewModel.presentedSlides()[1].dotLabel).toBe('home.demo.showSlide 2/3');
    expect(
      viewModel.presentedSlides().map((slide) => slide.isHiddenFromAssistiveTechnology),
    ).toEqual([false, true, true]);
  });

  it('offers every density by its width, the 1280-pixel file as the plain source', () => {
    demoSlidesIndex = { en: [{ '3': '1_3x.webp', '1': '1_1x.webp', '2': '1_2x.webp' }] };
    viewModel.startSlideshow();

    const [presentedSlide] = viewModel.presentedSlides();
    expect(presentedSlide.imageUrl).toBe('images/en/demo/1_1x.webp');
    expect(presentedSlide.imageSourceSet).toBe(
      'images/en/demo/1_1x.webp 1280w, images/en/demo/1_2x.webp 2560w, images/en/demo/1_3x.webp 3840w',
    );
    expect(presentedSlide.imageSizes).toBe('(min-width: 1440px) 1280px, 100vw');
  });

  it('moves to the next screenshot every ten seconds, and back to the first after the last', () => {
    viewModel.startSlideshow();

    vi.advanceTimersByTime(DEMO_SLIDE_DURATION_MILLISECONDS - 1);
    expect(activeSlidePositions()).toEqual([0]);

    vi.advanceTimersByTime(1);
    expect(activeSlidePositions()).toEqual([1]);
    expect(viewModel.trackTransform()).toBe('translateX(-100%)');

    vi.advanceTimersByTime(2 * DEMO_SLIDE_DURATION_MILLISECONDS);
    expect(activeSlidePositions()).toEqual([0]);
  });

  it('shows the screenshot a dot picks, and gives it a full ten seconds', () => {
    viewModel.startSlideshow();
    vi.advanceTimersByTime(DEMO_SLIDE_DURATION_MILLISECONDS - 1_000);

    viewModel.showSlide(2);
    expect(activeSlidePositions()).toEqual([2]);

    vi.advanceTimersByTime(DEMO_SLIDE_DURATION_MILLISECONDS - 1);
    expect(activeSlidePositions()).toEqual([2]);

    vi.advanceTimersByTime(1);
    expect(activeSlidePositions()).toEqual([0]);
  });

  it('shows the English screenshots for a language that has none yet', () => {
    demoSlidesIndex = { en: [{ '1': '1.webp' }, { '1': '2.webp' }] };
    currentLanguageCode.set('sk');
    viewModel.startSlideshow();

    expect(viewModel.presentedSlides()[0].imageUrl).toBe('images/en/demo/1.webp');
  });

  it('offers no dots for a single screenshot, and nothing at all when the list fails', () => {
    demoSlidesIndex = { en: [{ '1': '1.webp' }] };
    viewModel.startSlideshow();
    expect(viewModel.hasSeveralSlides()).toBe(false);

    TestBed.resetTestingModule();
    demoSlidesIndex = new Error('offline');
    TestBed.configureTestingModule({
      providers: [
        DemoSlideshowViewModel,
        {
          provide: DemoSlidesService,
          useValue: { loadDemoSlidesIndex: () => throwError(() => demoSlidesIndex) },
        },
        {
          provide: TranslationService,
          useValue: { currentLanguageCode, translate: (key: string) => key },
        },
      ],
    });
    const failedViewModel = TestBed.inject(DemoSlideshowViewModel);
    failedViewModel.startSlideshow();

    expect(failedViewModel.presentedSlides()).toEqual([]);
  });

  it('stops the timer when the slideshow is destroyed', () => {
    viewModel.startSlideshow();
    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });
});
