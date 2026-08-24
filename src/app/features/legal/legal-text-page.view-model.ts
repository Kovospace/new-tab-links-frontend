import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Which translated text a legal page shows, taken from its route.
 *
 * <p>Declared on the route rather than baked into a component, so that the privacy page and the
 * cookies page are one component and two route entries instead of two near-identical files.</p>
 */
export interface LegalTextRouteData {
  /** Translation key of the page's heading. */
  readonly headingTranslationKey: string;
  /** Translation key of the page's body. */
  readonly bodyTranslationKey: string;
}

/**
 * State behind a legal text page.
 *
 * <p>Reading the route data is a transformation, so it happens here and the template binds two
 * finished keys.</p>
 */
@Injectable()
export class LegalTextPageViewModel {
  private readonly activatedRoute = inject(ActivatedRoute);

  /** Which text this particular route asks for. */
  private readonly routeData = this.activatedRoute.snapshot.data as LegalTextRouteData;

  /** Translation key of the heading to render. */
  readonly headingTranslationKey = this.routeData.headingTranslationKey;

  /** Translation key of the body to render. */
  readonly bodyTranslationKey = this.routeData.bodyTranslationKey;
}
