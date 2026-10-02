import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { localizeAddress } from './localized-address';
import { DEFAULT_LANGUAGE_CODE, SupportedLanguageCode } from './supported-language';
import { TranslationService } from './translation.service';

/** The {@code data} of the route that groups one language's public pages. */
export interface AddressLanguageRouteData {
  /** The language every page below this route is shown in. */
  readonly addressLanguageCode: SupportedLanguageCode;
}

/**
 * Shows a public page in the language its address names.
 *
 * <p>Public pages have one address per language, so a search engine can index each language and a
 * shared link opens in the language it was shared in. The address therefore decides, not the
 * reader's stored preference.</p>
 *
 * <p>The one exception is an address in the default language, which is also where every old link,
 * every search result in another language and the extension's links land. A reader who prefers
 * another language is sent to that language's address instead, as the site always did by switching
 * language in place. A crawler has no stored preference and an English browser, so it stays.</p>
 *
 * @param route the route grouping one language's pages, carrying {@link AddressLanguageRouteData}
 * @param state the navigation, whose address is reused when redirecting
 * @returns true once the language is in place, or the preferred language's address
 */
export const followAddressLanguage: CanActivateFn = async (route, state) => {
  const translationService = inject(TranslationService);
  const router = inject(Router);
  const { addressLanguageCode } = route.data as AddressLanguageRouteData;

  const preferredLanguageCode = translationService.preferredLanguageCode();
  if (
    addressLanguageCode === DEFAULT_LANGUAGE_CODE &&
    preferredLanguageCode !== DEFAULT_LANGUAGE_CODE
  ) {
    return router.parseUrl(localizeAddress(state.url, preferredLanguageCode));
  }

  await translationService.useLanguage(addressLanguageCode);
  return true;
};
