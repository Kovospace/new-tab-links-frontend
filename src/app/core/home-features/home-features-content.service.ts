import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import {
  ImagePlacement,
  SiteMarkdownRenderingOptions,
  renderSiteMarkdown,
} from '../content/site-markdown-renderer';
import { LocalizedMarkdownService } from '../content/localized-markdown.service';
import { DEFAULT_LANGUAGE_CODE, SupportedLanguageCode } from '../i18n/supported-language';
import { ImageVersionStore } from '../images/image-version.store';
import { separateHomeFeaturePicture } from './home-feature-picture';

/**
 * Where the home page's points and their generated index are served from; they ship in
 * {@code public/content/home-features}.
 */
const HOME_FEATURES_CONTENT_ROOT = '/content/home-features';

/** Where a point's relatively named images are found, below {@code /images/<language>/}. */
const HOME_FEATURES_IMAGE_FOLDER = 'home-features';

/** One point as the index names it. */
export interface HomeFeatureSummary {
  /** The file name without its ordering number; names the point's image folder. */
  readonly slug: string;
  /** The markdown file's name, number included. */
  readonly fileName: string;
}

/**
 * Every point, by language, in the order they are shown.
 *
 * <p>Generated at build time by {@code scripts/build-home-features-index.mjs}, because a static
 * site cannot list a folder. A language with no points at all is absent rather than empty.</p>
 */
export type HomeFeaturesIndex = Partial<Record<string, readonly HomeFeatureSummary[]>>;

/**
 * One point, rendered, its picture apart from its text so the page can set them side by side.
 */
export interface RenderedHomeFeature {
  readonly slug: string;
  /** The point's picture as HTML; empty when the point has none. */
  readonly pictureHtml: string;
  /** The rest of the point as HTML, its {@code #} title an {@code <h2>} under the page's own. */
  readonly textHtml: string;
  /** The side the picture asked for with {@code #left} or {@code #right}; {@code null} if none. */
  readonly picturePlacement: ImagePlacement | null;
}

/**
 * The selling points on the home page, each a markdown file written exactly like a tip.
 *
 * <p>The list follows the reader's language, and falls back to the English list for a language
 * with no points written yet; each point in it falls back to English on its own until it is
 * translated. That is the tips' rule, and for the same reasons.</p>
 */
@Injectable({ providedIn: 'root' })
export class HomeFeaturesContentService {
  private readonly localizedMarkdownService = inject(LocalizedMarkdownService);
  private readonly imageVersionStore = inject(ImageVersionStore);

  /**
   * Fetches and renders every point, in order, in the reader's language where it exists.
   *
   * <p>A point that fails to load is left out rather than failing the rest: this is the front
   * page, and three of four selling points beat an error where they should be.</p>
   *
   * @param languageCode the reader's language
   * @returns the rendered points; empty when there are none or the index cannot be loaded
   */
  loadRenderedHomeFeatures(
    languageCode: SupportedLanguageCode,
  ): Observable<readonly RenderedHomeFeature[]> {
    return this.localizedMarkdownService
      .loadIndex<HomeFeaturesIndex>(HOME_FEATURES_CONTENT_ROOT)
      .pipe(
        map((index) => index[languageCode] ?? index[DEFAULT_LANGUAGE_CODE] ?? []),
        catchError(() => of<readonly HomeFeatureSummary[]>([])),
        switchMap((features) =>
          features.length === 0
            ? of([])
            : forkJoin(features.map((feature) => this.loadRenderedFeature(feature, languageCode))),
        ),
        map((features) => features.filter(isRendered)),
      );
  }

  /**
   * Fetches and renders one point, or nothing if it cannot be fetched.
   *
   * @param feature the point as the index names it
   * @param languageCode the reader's language
   * @returns the rendered point, or {@code null}
   */
  private loadRenderedFeature(
    feature: HomeFeatureSummary,
    languageCode: SupportedLanguageCode,
  ): Observable<RenderedHomeFeature | null> {
    return this.localizedMarkdownService
      .loadMarkdown(HOME_FEATURES_CONTENT_ROOT, feature.fileName, languageCode)
      .pipe(
        map((loaded): RenderedHomeFeature => {
          const renderingOptions: SiteMarkdownRenderingOptions = {
            languageCode: loaded.languageCode,
            imageFolder: `${HOME_FEATURES_IMAGE_FOLDER}/${feature.slug}`,
            markdownFolder: `${HOME_FEATURES_CONTENT_ROOT}/${loaded.languageCode}`,
            headingLevelOffset: 1,
            versionImageUrl: this.imageVersionStore.versionImageUrl,
          };
          const separated = separateHomeFeaturePicture(loaded.markdown);
          return {
            slug: feature.slug,
            pictureHtml:
              separated.pictureMarkdown === ''
                ? ''
                : renderSiteMarkdown(separated.pictureMarkdown, renderingOptions),
            textHtml: renderSiteMarkdown(separated.textMarkdown, renderingOptions),
            picturePlacement: separated.picturePlacement,
          };
        }),
        catchError(() => of(null)),
      );
  }
}

/**
 * Narrows away the points that could not be loaded.
 *
 * @param feature a point, or {@code null} for one that failed
 * @returns true for a rendered point
 */
function isRendered(feature: RenderedHomeFeature | null): feature is RenderedHomeFeature {
  return feature !== null;
}
