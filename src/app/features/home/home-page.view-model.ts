import { Injectable } from '@angular/core';

/**
 * One selling point of the extension, ready to render.
 */
export interface PresentedFeature {
  /** Translation key of the feature's title. */
  readonly titleTranslationKey: string;
  /** Translation key of the feature's description. */
  readonly textTranslationKey: string;
}

/**
 * State behind the home page.
 *
 * <p>The page is a presentation, so the only thing it has to decide is which selling points to
 * show and in what order. That list lives here rather than being written out three times in the
 * template, which keeps adding a fourth one a one-line change.</p>
 */
@Injectable()
export class HomePageViewModel {
  /** The selling points, in the order they are shown. */
  readonly presentedFeatures: readonly PresentedFeature[] = [
    {
      titleTranslationKey: 'home.features.groupsTitle',
      textTranslationKey: 'home.features.groupsText',
    },
    {
      titleTranslationKey: 'home.features.subgroupsTitle',
      textTranslationKey: 'home.features.subgroupsText',
    },
    {
      titleTranslationKey: 'home.features.workspacesTitle',
      textTranslationKey: 'home.features.workspacesText',
    },
    {
      titleTranslationKey: 'home.features.syncTitle',
      textTranslationKey: 'home.features.syncText',
    },
  ];
}
