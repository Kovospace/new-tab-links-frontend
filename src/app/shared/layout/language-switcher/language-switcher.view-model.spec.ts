import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SUPPORTED_LANGUAGE_CODES } from '../../../core/i18n/supported-language';
import { LanguageSwitcherViewModel } from './language-switcher.view-model';

describe('LanguageSwitcherViewModel', () => {
  let viewModel: LanguageSwitcherViewModel;

  beforeEach(() => {
    globalThis.localStorage?.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LanguageSwitcherViewModel],
    });

    viewModel = TestBed.inject(LanguageSwitcherViewModel);
  });

  it('offers every language the site is translated into', () => {
    const offeredCodes = viewModel.languageOptions().map((option) => option.languageCode);

    expect(offeredCodes).toEqual([...SUPPORTED_LANGUAGE_CODES]);
  });

  it('points each language at its own flag, so adding one needs only the file', () => {
    const flagUrlsByCode = Object.fromEntries(
      viewModel.languageOptions().map((option) => [option.languageCode, option.flagImageUrl]),
    );

    expect(flagUrlsByCode).toEqual({ en: '/flags/en-48.png', sk: '/flags/sk-48.png' });
  });

  it('offers each flag at three densities, so a retina screen is not handed the small one', () => {
    const sourceSetsByCode = Object.fromEntries(
      viewModel.languageOptions().map((option) => [option.languageCode, option.flagImageSourceSet]),
    );

    expect(sourceSetsByCode).toEqual({
      en: '/flags/en-48.png 1x, /flags/en-96.png 2x, /flags/en-144.png 3x',
      sk: '/flags/sk-48.png 1x, /flags/sk-96.png 2x, /flags/sk-144.png 3x',
    });
  });

  it('lays the flag out at the width the 1x image was rasterised to', () => {
    expect(viewModel.flagImageWidthInPixels).toBe(48);
  });

  it('names every option, because a flag cannot name the button it sits in', () => {
    const namedOptions = viewModel
      .languageOptions()
      .filter((option) => option.languageName.length > 0);

    expect(namedOptions).toHaveLength(SUPPORTED_LANGUAGE_CODES.length);
  });

  it('marks exactly one language as the one being displayed', () => {
    const activeOptions = viewModel.languageOptions().filter((option) => option.isActive);

    expect(activeOptions).toHaveLength(1);
  });
});
