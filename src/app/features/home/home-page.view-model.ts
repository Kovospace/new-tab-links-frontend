import { Injectable, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import {
  HomeFeaturesContentService,
  RenderedHomeFeature,
} from '../../core/home-features/home-features-content.service';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * State behind the home page.
 *
 * <p>The page is a presentation; what it decides itself is only which selling points to show. The
 * demo slideshow and the offers are components of their own, each with its own state.</p>
 */
@Injectable()
export class HomePageViewModel {
  private readonly translationService = inject(TranslationService);
  private readonly homeFeaturesContentService = inject(HomeFeaturesContentService);

  /**
   * The selling points, rendered from their markdown files, in the order they are shown.
   *
   * <p>Follows the reader's language: switching it fetches the points again, like every other
   * text on the site, and a newer fetch cancels an older one. Empty until they arrive — the page
   * around them needs nothing from them, so there is nothing to wait for.</p>
   */
  readonly presentedFeatures = toSignal(
    toObservable(this.translationService.currentLanguageCode).pipe(
      switchMap((languageCode) =>
        this.homeFeaturesContentService.loadRenderedHomeFeatures(languageCode),
      ),
    ),
    { initialValue: [] as readonly RenderedHomeFeature[] },
  );
}
