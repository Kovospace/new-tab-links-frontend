import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Everything written into the document's {@code <head>} for one page, already worded.
 */
export interface DocumentHeadContent {
  /** The {@code <html lang>} value, so screen readers and search engines read the right language. */
  readonly languageCode: string;

  /** The whole {@code <title>}, site name included. */
  readonly title: string;

  readonly description: string;

  /** The address search engines should credit, or null for a page that should not be listed. */
  readonly canonicalAddress: string | null;
}

/**
 * Writes a page's title, description, link preview tags and canonical link into the document.
 *
 * <p>Kept apart from deciding <em>what</em> to write ({@code PageMetadataService}) because this is
 * the only class in the application that reaches into the document head. Angular's {@code Title}
 * and {@code Meta} cover most of it. The canonical link has no Angular service, so it is the one
 * element created here by hand.</p>
 *
 * <p>The Open Graph tags it updates are first written statically in {@code src/index.html}, for
 * link previews that never run this code. Updating them keeps a page rendered at build time
 * consistent with its own title.</p>
 */
@Injectable({ providedIn: 'root' })
export class DocumentHeadWriter {
  private readonly document = inject(DOCUMENT);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);

  /**
   * Replaces whatever the previous page wrote.
   *
   * @param content the current page's head, worded in the reader's language
   */
  write(content: DocumentHeadContent): void {
    this.document.documentElement.lang = content.languageCode;
    this.titleService.setTitle(content.title);
    this.metaService.updateTag({ name: 'description', content: content.description });
    this.metaService.updateTag({ property: 'og:title', content: content.title });
    this.metaService.updateTag({ property: 'og:description', content: content.description });
    this.writeIndexability(content.canonicalAddress);
  }

  /**
   * Writes the canonical link, {@code og:url} and the robots directive together, because they
   * describe one decision: either this page is listed under one address, or it is not listed.
   *
   * @param canonicalAddress the address to credit, or null to ask search engines to skip the page
   */
  private writeIndexability(canonicalAddress: string | null): void {
    if (canonicalAddress === null) {
      this.metaService.updateTag({ name: 'robots', content: 'noindex' });
      this.metaService.removeTag("property='og:url'");
      this.findCanonicalLink()?.remove();
      return;
    }
    this.metaService.removeTag("name='robots'");
    this.metaService.updateTag({ property: 'og:url', content: canonicalAddress });
    this.findOrCreateCanonicalLink().setAttribute('href', canonicalAddress);
  }

  private findCanonicalLink(): HTMLLinkElement | null {
    return this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  }

  private findOrCreateCanonicalLink(): HTMLLinkElement {
    const existingLink = this.findCanonicalLink();
    if (existingLink) {
      return existingLink;
    }
    const createdLink = this.document.createElement('link');
    createdLink.setAttribute('rel', 'canonical');
    this.document.head.appendChild(createdLink);
    return createdLink;
  }
}
