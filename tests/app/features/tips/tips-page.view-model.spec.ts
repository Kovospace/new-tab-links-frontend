import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslationService } from '@app/core/i18n/translation.service';
import { TipsContentService, TipsIndex } from '@app/core/tips/tips-content.service';
import { TipsPageViewModel } from '@app/features/tips/tips-page.view-model';

/**
 * The list of tips follows the reader's language, and falls back to English.
 */
describe('TipsPageViewModel', () => {
  const currentLanguageCode = signal<'en' | 'sk'>('en');
  let index: TipsIndex;
  let viewModel: TipsPageViewModel;

  beforeEach(() => {
    currentLanguageCode.set('en');
    index = {
      en: [
        { slug: 'profiles', title: 'Profiles', text: 'Keep work and home apart.' },
        { slug: 'history', title: 'Discover history', text: 'Recently closed tabs.' },
      ],
      sk: [{ slug: 'profiles', title: 'Profily', text: 'Oddeľte prácu a domov.' }],
    };
    TestBed.configureTestingModule({
      providers: [
        TipsPageViewModel,
        { provide: TipsContentService, useValue: { loadTipsIndex: () => of(index) } },
        { provide: TranslationService, useValue: { currentLanguageCode } },
      ],
    });
    viewModel = TestBed.inject(TipsPageViewModel);
  });

  it("lists the tips in the reader's language, each linking to its page", () => {
    currentLanguageCode.set('sk');
    viewModel.loadTips();

    expect(viewModel.presentedTips()).toEqual([
      { slug: 'profiles', title: 'Profily', routerLink: '/sk/tips/profiles' },
    ]);
  });

  it('shows the English list for a language with no tips written yet', () => {
    index = { en: [{ slug: 'profiles', title: 'Profiles', text: '' }] };
    currentLanguageCode.set('sk');
    viewModel.loadTips();

    expect(viewModel.presentedTips()[0].title).toBe('Profiles');
    expect(viewModel.isEmpty()).toBe(false);
  });

  it('is empty, not loading, when there are no tips at all', () => {
    index = {};
    viewModel.loadTips();

    expect(viewModel.isLoading()).toBe(false);
    expect(viewModel.isEmpty()).toBe(true);
  });

  it('narrows the list to the tips whose title or text matches the search', () => {
    viewModel.loadTips();
    viewModel.searchTips('closed');

    expect(viewModel.presentedTips().map((tip) => tip.slug)).toEqual(['history']);
    expect(viewModel.hasNoSearchMatches()).toBe(false);
  });

  it('says nothing matches, rather than that no tips exist, when the search finds none', () => {
    viewModel.loadTips();
    viewModel.searchTips('calculator');

    expect(viewModel.presentedTips()).toEqual([]);
    expect(viewModel.hasNoSearchMatches()).toBe(true);
    expect(viewModel.isEmpty()).toBe(false);
  });
});
