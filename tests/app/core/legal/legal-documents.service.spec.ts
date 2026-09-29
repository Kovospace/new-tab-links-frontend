import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LegalDocumentsService,
  fillLegalDocumentPlaceholders,
} from '@app/core/legal/legal-documents.service';
import { LEGAL_OPERATOR } from '@app/core/legal/legal-operator';

/**
 * The legal documents: the operator's details written once and filled into every document, and a
 * document not yet translated shown in English rather than missing.
 */
describe('LegalDocumentsService', () => {
  let service: LegalDocumentsService;
  let httpTestingController: HttpTestingController;
  let rendered: string | undefined;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LegalDocumentsService);
    httpTestingController = TestBed.inject(HttpTestingController);
    rendered = undefined;
  });

  afterEach(() => httpTestingController.verify());

  it('renders the document in the reader language, its title the page h1', () => {
    service.loadRenderedLegalDocument('terms', 'sk').subscribe((html) => (rendered = html));
    httpTestingController.expectOne('/content/legal/sk/terms.md').flush('# Podmienky');

    expect(rendered).toContain('<h1>Podmienky</h1>');
  });

  it('falls back to English for a document not translated yet', () => {
    service.loadRenderedLegalDocument('refunds', 'sk').subscribe((html) => (rendered = html));
    httpTestingController
      .expectOne('/content/legal/sk/refunds.md')
      .flush('', { status: 404, statusText: 'Not Found' });
    httpTestingController.expectOne('/content/legal/en/refunds.md').flush('# Refund Policy');

    expect(rendered).toContain('<h1>Refund Policy</h1>');
  });

  it('fills in the support address, so a mail link in a document works', () => {
    service.loadRenderedLegalDocument('privacy', 'en').subscribe((html) => (rendered = html));
    httpTestingController
      .expectOne('/content/legal/en/privacy.md')
      .flush('Write to [{supportEmail}](mailto:{supportEmail}).');

    expect(rendered).toContain(
      `<a href="mailto:${LEGAL_OPERATOR.supportEmail}">${LEGAL_OPERATOR.supportEmail}</a>`,
    );
  });

  it('fills in every operator detail', () => {
    const filled = fillLegalDocumentPlaceholders(
      '{operatorName} {operatorRegistrationNumber} {operatorAddress}',
    );

    expect(filled).toBe(
      `${LEGAL_OPERATOR.name} ${LEGAL_OPERATOR.registrationNumber} ${LEGAL_OPERATOR.address}`,
    );
  });

  it('leaves an unknown placeholder as written, so a typo shows on the page', () => {
    expect(fillLegalDocumentPlaceholders('{suportEmail}')).toBe('{suportEmail}');
  });
});
