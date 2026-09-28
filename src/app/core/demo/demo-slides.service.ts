import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/** Where the generated list of demo screenshots is served from; it ships in {@code public/content/demo}. */
const DEMO_INDEX_URL = '/content/demo/index.json';

/**
 * The demo screenshots, by language: file names below {@code images/<language>/demo/}, in the
 * order they are shown.
 *
 * <p>Generated at build time by {@code scripts/build-demo-index.mjs}, because a static site cannot
 * list a folder. A language with no screenshots at all is absent rather than empty.</p>
 */
export type DemoSlidesIndex = Partial<Record<string, readonly string[]>>;

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
