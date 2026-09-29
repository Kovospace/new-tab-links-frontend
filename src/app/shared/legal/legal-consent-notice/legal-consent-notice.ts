import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../../core/routing/application-route-paths';

/** The moment a notice is shown at, which decides the documents it names. */
export type LegalConsentMoment = 'REGISTRATION' | 'PURCHASE';

/** One notice's sentence, cut where its two links go. */
interface LegalConsentNoticeWording {
  /** Translation key of the words before the first link. */
  readonly leadTranslationKey: string;
  /** Translation key of the first link's label. */
  readonly firstDocumentLabelTranslationKey: string;
  /** Where the first link goes. */
  readonly firstDocumentLink: string;
  /** Translation key of the words between the links. */
  readonly joinerTranslationKey: string;
  /** Translation key of the second link's label. */
  readonly secondDocumentLabelTranslationKey: string;
  /** Where the second link goes. */
  readonly secondDocumentLink: string;
  /** Translation key of the words after the second link. */
  readonly closingTranslationKey: string;
}

/**
 * Each moment's sentence.
 *
 * <p>The link labels are their own keys rather than the footer's, because in Slovak a document's
 * name is declined inside a sentence ("súhlasíte s Podmienkami používania") where the footer
 * names it in the nominative.</p>
 */
const LEGAL_CONSENT_NOTICE_WORDINGS: Readonly<Record<LegalConsentMoment, LegalConsentNoticeWording>> =
  {
    REGISTRATION: {
      leadTranslationKey: 'legal.consent.registrationLead',
      firstDocumentLabelTranslationKey: 'legal.consent.registrationTermsLabel',
      firstDocumentLink: APPLICATION_ROUTE_LINKS.terms,
      joinerTranslationKey: 'legal.consent.registrationJoiner',
      secondDocumentLabelTranslationKey: 'legal.consent.registrationPrivacyLabel',
      secondDocumentLink: APPLICATION_ROUTE_LINKS.privacy,
      closingTranslationKey: 'legal.consent.registrationClosing',
    },
    PURCHASE: {
      leadTranslationKey: 'legal.consent.purchaseLead',
      firstDocumentLabelTranslationKey: 'legal.consent.purchaseTermsLabel',
      firstDocumentLink: APPLICATION_ROUTE_LINKS.terms,
      joinerTranslationKey: 'legal.consent.purchaseJoiner',
      secondDocumentLabelTranslationKey: 'legal.consent.purchaseRefundsLabel',
      secondDocumentLink: APPLICATION_ROUTE_LINKS.refunds,
      closingTranslationKey: 'legal.consent.purchaseClosing',
    },
  };

/**
 * The line under a form that says which documents the reader accepts by submitting it, each one a
 * link.
 *
 * <p>A statement rather than a checkbox: accepting the terms is what submitting means, the
 * privacy policy is information rather than something consented to, and a checkbox would add a
 * required field to every registration for no legal gain.</p>
 *
 * <p>No view-model: picking one of two fixed sentences by an input is the whole of its logic.</p>
 */
@Component({
  selector: 'app-legal-consent-notice',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './legal-consent-notice.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalConsentNotice {
  /** The moment the notice is shown at. */
  readonly moment = input.required<LegalConsentMoment>();

  /** The sentence for that moment. */
  protected readonly wording = computed<LegalConsentNoticeWording>(
    () => LEGAL_CONSENT_NOTICE_WORDINGS[this.moment()],
  );
}
