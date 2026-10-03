import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/**
 * HTML rendered from the site's markdown — a tip, a home page point, a legal document — with the
 * one stylesheet that says how such HTML looks.
 *
 * <p><strong>Its styles are not encapsulated, on purpose.</strong> Angular scopes a component's
 * rules by stamping an attribute on every element of its template and adding it to every selector,
 * and HTML set through {@code innerHTML} never gets the stamp: a scoped rule for {@code ul} could
 * never match the markdown's list. So the stylesheet is global, and every rule in it stays under
 * {@code .rendered-markdown}, the class this component puts on itself.</p>
 *
 * <p>A page that wants the markdown to look slightly different does not write rules for it — its
 * own scoped rules could not reach the markdown either. It sets the {@code --markdown-*} custom
 * properties this stylesheet reads on an element of its own template; custom properties inherit,
 * so the value flows down into the rendered HTML while the page keeps its encapsulation. The
 * properties, and their defaults, are listed at the top of {@code rendered-markdown.scss}.</p>
 *
 * <p>The HTML is bound to the host itself, so there is no wrapper element between the page's
 * markup and the markdown's.</p>
 */
@Component({
  selector: 'app-rendered-markdown',
  template: '',
  styleUrl: './rendered-markdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'rendered-markdown',
    '[innerHTML]': 'html()',
  },
})
export class RenderedMarkdown {
  /**
   * The rendered HTML. Angular sanitises it on the way in, so a script or an event handler in a
   * markdown file is dropped rather than run.
   */
  readonly html = input.required<string>();
}
