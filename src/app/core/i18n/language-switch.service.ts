import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { AddressLanguageRouteData } from './address-language.guard';
import { localizeAddress, splitLanguagePrefix } from './localized-address';
import { SupportedLanguageCode } from './supported-language';
import { TranslationService } from './translation.service';

/**
 * Switches the language the reader chose, and with it the address of a public page.
 *
 * <p>A public page has an address per language, so switching on one means going to the same page
 * at the other language's address. Otherwise the page and its address would disagree, and a
 * reload or a shared link would bring back the old language. Every other page has one address
 * and simply changes language in place.</p>
 */
@Injectable({ providedIn: 'root' })
export class LanguageSwitchService {
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  /**
   * Shows the site in another language from now on.
   *
   * <p>The choice is stored before navigating, not after. Arriving on a default-language address,
   * {@code followAddressLanguage} redirects a reader whose stored choice is another language. If
   * the old choice were still stored, switching to English would bounce straight back.</p>
   *
   * @param languageCode the language chosen
   * @returns a promise that settles once the page shows that language
   */
  async switchLanguage(languageCode: SupportedLanguageCode): Promise<void> {
    await this.translationService.changeLanguage(languageCode);
    if (this.isShowingLocalizedPage()) {
      const { unprefixedAddress } = splitLanguagePrefix(this.router.url);
      await this.router.navigateByUrl(localizeAddress(unprefixedAddress, languageCode));
    }
  }

  /**
   * Whether the page shown has an address per language. Its route group says so. The group has
   * no component, so its pages inherit its data.
   */
  private isShowingLocalizedPage(): boolean {
    let snapshot: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }
    const routeData = snapshot.data as Partial<AddressLanguageRouteData>;
    return routeData.addressLanguageCode !== undefined;
  }
}
