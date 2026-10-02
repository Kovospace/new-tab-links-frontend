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

  /** The {@code og:locale} value, such as {@code sk_SK}. */
  readonly openGraphLocale: string;

  /** The address search engines should credit, or null for a page that should not be listed. */
  readonly canonicalAddress: string | null;

  /**
   * The same page in every language, for {@code <link rel="alternate" hreflang>}. Empty for a page
   * that should not be listed. The {@code x-default} entry names where a reader of any other
   * language should land.
   */
  readonly alternateAddresses: readonly AlternateAddress[];
}

/** One language's address of a page. */
export interface AlternateAddress {
  /** A language code, or {@code x-default}. */
  readonly hreflang: string;
  readonly address: string;
}

/** Marks the alternate links this writer owns, so it removes only its own. */
const ALTERNATE_LINK_SELECTOR = 'link[rel="alternate"][hreflang]';

/**
 * Writes a page's title, description, link preview tags and canonical link into the document.
 *
 * <p>Kept apart from deciding <em>what</em> to write ({@code PageMetadataService}) because this is
 * the only class in the application that reaches into the document head. Angular's {@code Title}
 * and {@code Meta} cover most of it. The canonical and alternate links have no Angular service,
 * so they are the elements created here by hand.</p>
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
    this.metaService.updateTag({ property: 'og:locale', content: content.openGraphLocale });
    this.writeIndexability(content.canonicalAddress);
    this.writeAlternateAddresses(content.alternateAddresses);
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

  /**
   * Replaces the {@code hreflang} links, which tell a search engine that {@code /tips} and
   * {@code /sk/tips} are one page in two languages rather than two pages competing.
   *
   * @param alternateAddresses the page's address in every language, or none
   */
  private writeAlternateAddresses(alternateAddresses: readonly AlternateAddress[]): void {
    this.document.head
      .querySelectorAll(ALTERNATE_LINK_SELECTOR)
      .forEach((alternateLink) => alternateLink.remove());
    for (const { hreflang, address } of alternateAddresses) {
      const alternateLink = this.document.createElement('link');
      alternateLink.setAttribute('rel', 'alternate');
      alternateLink.setAttribute('hreflang', hreflang);
      alternateLink.setAttribute('href', address);
      this.document.head.appendChild(alternateLink);
    }
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
