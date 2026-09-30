import { Injectable, computed, inject } from '@angular/core';
import { PremiumPricingStore } from '../../../core/billing/premium-pricing.store';
import { TranslationService } from '../../../core/i18n/translation.service';
import { describeCurrency } from '../../formatting/price-formatter';

/** One currency as an option of the picker. */
export interface PresentedCurrencyOption {
  /** ISO 4217 code, the option's value. */
  readonly currency: string;
  /** What the option reads, e.g. {@code € EUR}. */
  readonly label: string;
  /** The currency's full name in the reader's language, e.g. {@code Euro}. */
  readonly name: string;
  /** Whether prices are shown in this currency now. */
  readonly isSelected: boolean;
}

/**
 * State behind the currency picker.
 *
 * <p>The options are whatever the backend has on sale, named by {@code Intl} in the reader's
 * language — so no currency is listed here, and one added later appears on its own.</p>
 */
@Injectable()
export class CurrencySwitcherViewModel {
  private readonly premiumPricingStore = inject(PremiumPricingStore);
  private readonly translationService = inject(TranslationService);

  /** Whether there is a choice to make; with one currency or none the picker is left out. */
  readonly isShown = computed<boolean>(() => this.premiumPricingStore.offeredCurrencies().length > 1);

  /** Every currency on sale, as options. */
  readonly currencyOptions = computed<readonly PresentedCurrencyOption[]>(() => {
    const languageCode = this.translationService.currentLanguageCode();
    const selectedCurrency = this.premiumPricingStore.selectedCurrency();
    return this.premiumPricingStore.offeredCurrencies().map((currency) => {
      const description = describeCurrency(currency, languageCode);
      return {
        currency,
        label: description.shortLabel,
        name: description.name,
        isSelected: currency === selectedCurrency,
      };
    });
  });

  /**
   * Shows every price on the site in another currency.
   *
   * @param currency the chosen option's value
   */
  chooseCurrency(currency: string): void {
    this.premiumPricingStore.chooseCurrency(currency);
  }
}
