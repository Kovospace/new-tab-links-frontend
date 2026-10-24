import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ChangelogContentService,
  ChangelogIndex,
} from '@app/core/changelog/changelog-content.service';
import { TranslationService } from '@app/core/i18n/translation.service';
import {
  ChangelogPageViewModel,
  mergeReleasesByVersion,
} from '@app/features/changelog/changelog-page.view-model';

const englishRelease = (version: string, highlight: string) => ({
  version,
  releasedOn: '2026-10-08',
  highlights: [highlight],
});

/**
 * The changelog lists every release once, newest first, translated where it is.
 */
describe('mergeReleasesByVersion', () => {
  it('keeps a release not yet translated, in English, in its place by version', () => {
    const index: ChangelogIndex = {
      en: [
        englishRelease('0.10.0', 'Newest'),
        englishRelease('0.9.0', 'Older'),
        englishRelease('0.1.0', 'First'),
      ],
      sk: [englishRelease('0.9.0', 'Staršie'), englishRelease('0.1.0', 'Prvé')],
    };

    expect(mergeReleasesByVersion(index, 'sk').map((release) => release.highlights[0])).toEqual([
      'Newest',
      'Staršie',
      'Prvé',
    ]);
  });
});

describe('ChangelogPageViewModel', () => {
  const currentLanguageCode = signal<'en' | 'sk'>('en');
  let index: ChangelogIndex;
  let viewModel: ChangelogPageViewModel;

  beforeEach(() => {
    currentLanguageCode.set('en');
    index = { en: [englishRelease('0.1.0', 'The first public release')] };
    TestBed.configureTestingModule({
      providers: [
        ChangelogPageViewModel,
        { provide: ChangelogContentService, useValue: { loadChangelogIndex: () => of(index) } },
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode,
            translate: (key: string, parameters: Record<string, string>) =>
              `${key}:${parameters['date']}`,
          },
        },
      ],
    });
    viewModel = TestBed.inject(ChangelogPageViewModel);
  });

  it('words the release date and links each release to its page', () => {
    currentLanguageCode.set('sk');
    viewModel.loadReleases();

    expect(viewModel.presentedReleases()).toEqual([
      {
        version: '0.1.0',
        releasedOnLine: 'changelog.releasedOn:8. októbra 2026',
        highlights: ['The first public release'],
        routerLink: '/sk/changelog/0.1.0',
      },
    ]);
  });

  it('is empty, not loading, when no release has notes yet', () => {
    index = {};
    viewModel.loadReleases();

    expect(viewModel.isLoading()).toBe(false);
    expect(viewModel.isEmpty()).toBe(true);
  });
});
