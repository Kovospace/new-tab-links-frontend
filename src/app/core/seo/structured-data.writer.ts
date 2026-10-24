import { DOCUMENT, Injectable, inject } from '@angular/core';

/** Marks the one structured-data script this writer owns. */
const STRUCTURED_DATA_SCRIPT_ID = 'page-structured-data';

/**
 * Writes a page's schema.org structured data into the document head, as JSON-LD.
 *
 * <p>Apart from {@code DocumentHeadWriter} because only some pages have any, and a page that has
 * some must take it away again when it is left — otherwise the next page would claim to be an FAQ.
 * A page owns at most one script; writing again replaces it.</p>
 *
 * <p>Written during the build's pre-rendering like the rest of the head, so crawlers that never
 * run JavaScript read it from the HTML file.</p>
 */
@Injectable({ providedIn: 'root' })
export class StructuredDataWriter {
  private readonly document = inject(DOCUMENT);

  /**
   * Replaces the page's structured data.
   *
   * <p>{@code <} is escaped, so that an answer containing {@code </script>} cannot end the
   * script early.</p>
   *
   * @param structuredData the JSON-LD object
   */
  write(structuredData: Record<string, unknown>): void {
    const script = this.findScript() ?? this.createScript();
    script.textContent = JSON.stringify(structuredData).replace(/</g, '\\u003c');
  }

  /** Removes the page's structured data, if it wrote any. */
  remove(): void {
    this.findScript()?.remove();
  }

  private findScript(): HTMLScriptElement | null {
    return this.document.head.querySelector<HTMLScriptElement>(`#${STRUCTURED_DATA_SCRIPT_ID}`);
  }

  private createScript(): HTMLScriptElement {
    const script = this.document.createElement('script');
    script.id = STRUCTURED_DATA_SCRIPT_ID;
    script.type = 'application/ld+json';
    this.document.head.appendChild(script);
    return script;
  }
}
