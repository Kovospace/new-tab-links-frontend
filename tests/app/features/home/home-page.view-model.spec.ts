import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HomeFeaturesContentService,
  RenderedHomeFeature,
} from '@app/core/home-features/home-features-content.service';
import { TranslationService } from '@app/core/i18n/translation.service';
import { HomePageViewModel } from '@app/features/home/home-page.view-model';

/**
 * How the pitch sections are worded from their translation groups, and that they follow a
 * language switch.
 */
describe('HomePageViewModel', () => {
  const translations = signal<ReadonlyMap<string, string | readonly string[]>>(new Map());
  let viewModel: HomePageViewModel;
  let renderedFeatures: readonly RenderedHomeFeature[] = [];

  const lookUp = (key: string): readonly string[] => {
    const value = translations().get(key);
    return value === undefined ? [key] : typeof value === 'string' ? [value] : value;
  };

  beforeEach(() => {
    renderedFeatures = [];
    translations.set(
      new Map<string, string | readonly string[]>([
        ['home.pitchSections.audience.heading', 'Who is it for?'],
        ['home.pitchSections.audience.lead', 'People who:'],
        ['home.pitchSections.audience.points', ['Have many bookmarks', 'Use many browsers']],
      ]),
    );
    TestBed.configureTestingModule({
      providers: [
        HomePageViewModel,
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode: signal('en'),
            translate: (key: string) => lookUp(key).join(' '),
            translateToParagraphs: lookUp,
          },
        },
        {
          provide: HomeFeaturesContentService,
          useValue: { loadRenderedHomeFeatures: () => of(renderedFeatures) },
        },
      ],
    });
    viewModel = TestBed.inject(HomePageViewModel);
  });

  it('words each section from its heading, lead and points', () => {
    expect(viewModel.presentedPitchSections()[0]).toEqual({
      heading: 'Who is it for?',
      lead: 'People who:',
      points: ['Have many bookmarks', 'Use many browsers'],
    });
  });

  it('shows the advantages section after the audience one', () => {
    expect(viewModel.presentedPitchSections().map((section) => section.heading)).toEqual([
      'Who is it for?',
      'home.pitchSections.advantages.heading',
    ]);
  });

  it('rewords the sections when the translations change', () => {
    translations.update((current) =>
      new Map(current).set('home.pitchSections.audience.heading', 'Pre koho?'),
    );

    expect(viewModel.presentedPitchSections()[0].heading).toBe('Pre koho?');
  });

  it('alternates the pictures left and right unless a picture asked for a side', () => {
    const feature = (
      slug: string,
      picturePlacement: RenderedHomeFeature['picturePlacement'],
    ): RenderedHomeFeature => ({
      slug,
      pictureHtml: '<p><img></p>',
      textHtml: '',
      picturePlacement,
    });
    renderedFeatures = [
      feature('first', null),
      feature('second', null),
      feature('third', 'right'),
      feature('fourth', 'left'),
    ];
    viewModel = TestBed.inject(HomePageViewModel);
    TestBed.tick();

    expect(viewModel.presentedFeatures().map((presented) => presented.isPictureOnRight)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('marks a point without a picture as text alone', () => {
    renderedFeatures = [
      { slug: 'plain', pictureHtml: '', textHtml: '<h2>Plain</h2>', picturePlacement: null },
    ];
    viewModel = TestBed.inject(HomePageViewModel);
    TestBed.tick();

    expect(viewModel.presentedFeatures()[0].hasPicture).toBe(false);
  });
});
