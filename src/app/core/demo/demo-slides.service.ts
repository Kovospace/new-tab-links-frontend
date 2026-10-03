import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Where the generated list of demo screenshots is served from; it ships in {@code public/content/demo}. */
const DEMO_INDEX_URL = '/content/demo/index.json';

/**
 * One screenshot's files below {@code images/<language>/demo/}, by pixel density: {@code "1"} is
 * the slide at its 1280x800 size, {@code "2"} and {@code "3"} the same picture two and three times
 * as large, for sharper screens. A slide exported in one density only has just {@code "1"}.
 */
export type DemoSlideFiles = Readonly<Partial<Record<string, string>>>;

/**
 * The demo screenshots, by language, in the order they are shown.
 *
 * <p>Generated at build time by {@code scripts/build-demo-index.mjs}, because a static site cannot
 * list a folder. A language with no screenshots at all is absent rather than empty.</p>
 */
export type DemoSlidesIndex = Partial<Record<string, readonly DemoSlideFiles[]>>;

/**
 * The list of screenshots the home page's slideshow cycles through.
 *
 * <p>Not {@code BackendApiClient}: this is a static file of this site, like the translations, not
 * a call to the backend.</p>
 */
@Injectable({ providedIn: 'root' })
export class DemoSlidesService {
  private readonly httpClient = inject(HttpClient);

  /**
   * Fetches the list of every demo screenshot.
   *
   * @returns the screenshots by language
   */
  loadDemoSlidesIndex(): Observable<DemoSlidesIndex> {
    return this.httpClient.get<DemoSlidesIndex>(DEMO_INDEX_URL);
  }
}
