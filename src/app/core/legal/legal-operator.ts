/**
 * Who runs this service, and how to reach them — the facts every legal document and the footer
 * state.
 *
 * <p>Kept in one place because the privacy policy, the terms, the refund policy, the cookie
 * statement and the footer all repeat them, and a support address that differs between two of
 * those is worse than none. The documents name them as placeholders — {@code {supportEmail}} and
 * the rest — that {@code LegalDocumentsService} fills from here.</p>
 *
 * <p>Not runtime configuration: these are the same in every environment, and a test deployment
 * showing the real operator is correct rather than a leak.</p>
 */
export const LEGAL_OPERATOR = {
  /** The seller and the controller of personal data, as registered. */
  name: 'Matej Kovac',
  /** The trade register's identification number (IČO). */
  registrationNumber: '21870781',
  /** The registered business address. */
  address: 'Kaprova 42/14, 110 00 Praha 1, Czech Republic',
  /** Where users write for support, refunds and data-protection requests. */
  supportEmail: 'support@tabilinks.app',
} as const;

/**
 * The date the legal documents last changed, stated at the top of each.
 *
 * <p>Raise it whenever the wording of any of them changes in substance.</p>
 */
export const LEGAL_DOCUMENTS_EFFECTIVE_DATE = '2026-09-29';
