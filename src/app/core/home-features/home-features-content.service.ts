import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { renderSiteMarkdown } from '../content/site-markdown-renderer';
import { LocalizedMarkdownService } from '../content/localized-markdown.service';
import { DEFAULT_LANGUAGE_CODE, SupportedLanguageCode } from '../i18n/supported-language';

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

/** One point, rendered. */
export interface RenderedHomeFeature {
  readonly slug: string;
  /** The point's markdown as HTML, its {@code #} title an {@code <h2>} under the page's own. */
  readonly html: string;
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
        map((loaded): RenderedHomeFeature => ({
          slug: feature.slug,
          html: renderSiteMarkdown(loaded.markdown, {
            languageCode: loaded.languageCode,
            imageFolder: `${HOME_FEATURES_IMAGE_FOLDER}/${feature.slug}`,
            headingLevelOffset: 1,
          }),
        })),
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
