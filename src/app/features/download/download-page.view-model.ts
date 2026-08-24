import { Injectable } from '@angular/core';
import { APPLICATION_CONFIGURATION } from '../../core/config/application-configuration';

/**
 * One way to get the extension, ready to render.
 */
export interface DownloadOption {
  /** Translation key of the option's heading. */
  readonly headingTranslationKey: string;
  /** Translation key of the explanation under the heading. */
  readonly textTranslationKey: string;
  /** Translation key of the link's own label. */
  readonly actionTranslationKey: string;
  /** Translation key of the wording shown instead of the link when there is nothing to link to. */
  readonly unavailableTranslationKey: string;
  /** Where the link points; empty while this option is not published yet. */
  readonly downloadUrl: string;
  /** Whether the link can be offered at all. */
  readonly isAvailable: boolean;
  /** Whether the link leaves this site, which decides how it opens. */
  readonly leavesThisSite: boolean;
}

/**
 * State behind the download page.
 *
 * <p>Neither download target exists yet, and the page has to cope with that without showing a
 * dead link. Deciding whether an option can be offered is done here, so the template only picks
 * between two blocks of markup and never inspects a URL.</p>
 */
@Injectable()
export class DownloadPageViewModel {
  /** The ways to install, in the order they are offered. */
  readonly downloadOptions: readonly DownloadOption[] = [
    buildDownloadOption(
      'download.webStoreHeading',
      'download.webStoreText',
      'download.webStoreAction',
      'download.webStoreUnavailable',
      APPLICATION_CONFIGURATION.extensionDownload.chromeWebStoreUrl,
      true,
    ),
    buildDownloadOption(
      'download.crxHeading',
      'download.crxText',
      'download.crxAction',
      'download.crxUnavailable',
      APPLICATION_CONFIGURATION.extensionDownload.selfHostedCrxPath,
      false,
    ),
  ];
}

/**
 * Builds one download option, working out whether it can be offered.
 *
 * @param headingTranslationKey     key of the option's heading
 * @param textTranslationKey        key of the explanation
 * @param actionTranslationKey      key of the link's label
 * @param unavailableTranslationKey key of the wording used when there is no link
 * @param downloadUrl               where the link points, empty when unpublished
 * @param leavesThisSite            whether following the link leaves this site
 * @returns the option, ready to render
 */
function buildDownloadOption(
  headingTranslationKey: string,
  textTranslationKey: string,
  actionTranslationKey: string,
  unavailableTranslationKey: string,
  downloadUrl: string,
  leavesThisSite: boolean,
): DownloadOption {
  return {
    headingTranslationKey,
    textTranslationKey,
    actionTranslationKey,
    unavailableTranslationKey,
    downloadUrl,
    isAvailable: downloadUrl.length > 0,
    leavesThisSite,
  };
}
