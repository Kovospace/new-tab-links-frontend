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

  it('shows the first screen until another is picked', () => {
    const viewModel = new ThemeShowcaseViewModel();
    const [firstScreen, secondScreen] = viewModel.screens;

    expect(viewModel.shownScreen()).toBe(firstScreen);
    expect(viewModel.isScreenShown(firstScreen)).toBe(true);
    expect(viewModel.isScreenShown(secondScreen)).toBe(false);
  });

  it('switches screens and keeps the divider where it was', () => {
    const viewModel = new ThemeShowcaseViewModel();
    const secondScreen = viewModel.screens[1];

    viewModel.moveDivider(30);
    viewModel.showScreen(secondScreen);

    expect(viewModel.shownScreen()).toBe(secondScreen);
    expect(viewModel.shownScreen().darkScreenshotPath).toBe('theme-showcase/2-dark_1x.webp');
    expect(viewModel.dividerPositionPercent()).toBe(30);
  });
});
