import { Injectable, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import {
  HomeFeaturesContentService,
  RenderedHomeFeature,
} from '../../core/home-features/home-features-content.service';
import { RUNTIME_CONFIGURATION } from '../../core/config/runtime-configuration';
import { TranslationService } from '../../core/i18n/translation.service';
import { LocalizedRouteLinks } from '../../core/routing/localized-route-links';

/**
 * The translation keys of the short pitch sections under the page heading, in the order shown.
 *
 * <p>Each names a group in {@code public/i18n/<code>.json} holding a {@code heading}, a
 * {@code lead} and {@code points}, an array with one entry per bullet. Adding a section is a new
 * group in both translation files and one entry here; the template needs nothing.</p>
 */
const PITCH_SECTION_TRANSLATION_KEYS = [
  'home.pitchSections.audience',
  'home.pitchSections.advantages',
] as const;

/** One pitch section, worded and ready to bind. */
export interface PresentedPitchSection {
  /** The section's heading. */
  readonly heading: string;
  /** The sentence introducing the points. */
  readonly lead: string;
  /** The bulleted points, in the order the translation file lists them. */
  readonly points: readonly string[];
}

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
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);
  private readonly runtimeConfiguration = inject(RUNTIME_CONFIGURATION);

  /**
   * The Chrome Web Store listing "Add to Chrome" opens, empty while it is not published.
   *
   * <p>Read from the runtime configuration, like the download page's, so the button follows the
   * store link the deployment sets rather than one compiled in.</p>
   */
  readonly chromeWebStoreUrl = this.runtimeConfiguration.extensionDownload.chromeWebStoreUrl;

  /**
   * Whether "Add to Chrome" can link to the store.
   *
   * <p>The button goes to the store and nowhere else. While the listing is unpublished it is still
   * shown, greyed out and linking nowhere, so the hero keeps its shape and turns live the moment a
   * deployment sets the address.</p>
   */
  readonly isChromeWebStorePublished = this.chromeWebStoreUrl.length > 0;

  /** The tour page, which "Take the tour" opens. */
  readonly tourLink = computed<string>(() => this.localizedRouteLinks.links().tour);

  /** The comparison with other extensions, linked under the "better than the competition" points. */
  readonly comparisonLink = computed<string>(() => this.localizedRouteLinks.links().comparison);

  /**
   * The pitch sections, worded in the reader's language.
   *
   * <p>Plain JSON rather than markdown like the selling points below: a heading, a sentence and a
   * list need no formatting, and follow a language switch through the translation signal.</p>
   */
  readonly presentedPitchSections = computed<readonly PresentedPitchSection[]>(() =>
    PITCH_SECTION_TRANSLATION_KEYS.map((sectionKey) => this.presentPitchSection(sectionKey)),
  );

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

  /**
   * Words one pitch section.
   *
   * @param sectionKey the translation key of the section's group
   * @returns the section's heading, lead and points in the active language
   */
  private presentPitchSection(sectionKey: string): PresentedPitchSection {
    return {
      heading: this.translationService.translate(`${sectionKey}.heading`),
      lead: this.translationService.translate(`${sectionKey}.lead`),
      points: this.translationService.translateToParagraphs(`${sectionKey}.points`),
    };
  }
}
