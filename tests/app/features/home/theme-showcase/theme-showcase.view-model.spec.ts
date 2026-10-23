import { describe, expect, it } from 'vitest';
import { ThemeShowcaseViewModel } from '@app/features/home/theme-showcase/theme-showcase.view-model';

/** How the divider's position becomes the dark screenshot's clip and the divider's offset. */
describe('ThemeShowcaseViewModel', () => {
  it('starts halfway, showing both themes', () => {
    const viewModel = new ThemeShowcaseViewModel();

    expect(viewModel.darkScreenshotClipPath()).toBe('inset(0 0 0 50%)');
    expect(viewModel.dividerLeft()).toBe('50%');
  });

  it('moves the clip and the divider together', () => {
    const viewModel = new ThemeShowcaseViewModel();

    viewModel.moveDivider(20);

    expect(viewModel.darkScreenshotClipPath()).toBe('inset(0 0 0 20%)');
    expect(viewModel.dividerLeft()).toBe('20%');
  });

  it('keeps the divider inside the picture', () => {
    const viewModel = new ThemeShowcaseViewModel();

    viewModel.moveDivider(140);
    expect(viewModel.dividerPositionPercent()).toBe(100);

    viewModel.moveDivider(-5);
    expect(viewModel.dividerPositionPercent()).toBe(0);

    viewModel.moveDivider(Number.NaN);
    expect(viewModel.dividerPositionPercent()).toBe(50);
  });
});
