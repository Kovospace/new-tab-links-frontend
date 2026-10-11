import { Injectable, computed, inject } from '@angular/core';
import { PremiumPricingStore } from '../../core/billing/premium-pricing.store';
import {
  COMPARED_EXTENSIONS,
  COMPARED_FEATURES,
  COMPARISON_CHECKED_ON,
  ComparedExtension,
  FeatureFinding,
  FreeVersionLimits,
  PaidPlan,
  PriceFinding,
} from '../../core/comparison/compared-extensions';
import { TranslationService } from '../../core/i18n/translation.service';
import { LEGAL_OPERATOR } from '../../core/legal/legal-operator';
import { FORMATTING_LOCALES } from '../../shared/formatting/instant-formatter';
import { formatPrice } from '../../shared/formatting/price-formatter';

/** One cell of the table, worded. */
export interface PresentedComparisonCell {
  readonly text: string;
  /** The numbers of the footnotes qualifying the cell, such as {@code 1, 3}; empty when none. */
  readonly footnoteMarker: string;
}

/** One row of the table, worded. */
export interface PresentedComparisonRow {
  readonly name: string;
  /** Where the row's claims can be checked; {@code null} for Tabilinks' own row. */
  readonly storeUrl: string | null;
  readonly nameFootnoteMarker: string;
  readonly isTabilinks: boolean;
  /** The feature cells, then the free version limits, then the price. */
  readonly cells: readonly PresentedComparisonCell[];
}

/** One footnote under the table. */
export interface PresentedFootnote {
  readonly number: number;
  readonly text: string;
}

/** The table's column headers after the first, in the order of the cells. */
const DATA_COLUMN_TRANSLATION_KEYS: readonly string[] = [
  ...COMPARED_FEATURES.map((feature) => `comparison.columns.${feature}`),
  'comparison.columns.freeVersionLimits',
  'comparison.columns.price',
];

/**
 * State behind the comparison page.
 *
 * <p>Turns the language-neutral findings into the reader's words, and numbers the footnotes in
 * the order the reader meets them, so a footnote shared by several rows has one number. The
 * table itself is fixed content; only Tabilinks' price arrives later, from the payment provider.</p>
 */
@Injectable()
export class ComparisonPageViewModel {
  private readonly translationService = inject(TranslationService);
  private readonly premiumPricingStore = inject(PremiumPricingStore);

  /** Where corrections are sent. */
  readonly supportEmail = LEGAL_OPERATOR.supportEmail;

  /** The same address as a link. */
  readonly supportEmailHref = `mailto:${LEGAL_OPERATOR.supportEmail}`;

  /** The headers of the columns after the extension's name. */
  readonly dataColumnHeaders = computed<readonly string[]>(() =>
    DATA_COLUMN_TRANSLATION_KEYS.map((key) => this.translationService.translate(key)),
  );

  /** When the competitors were last checked, in the reader's words. */
  readonly checkedOnNotice = computed<string>(() =>
    this.translationService.translate('comparison.checkedOn', {
      date: this.formatCheckedOnDate(),
    }),
  );

  /** Every footnote key, numbered from 1 in the order the table first uses it. */
  private readonly footnoteNumbers = computed<ReadonlyMap<string, number>>(() => {
    const numbers = new Map<string, number>();
    for (const noteKey of COMPARED_EXTENSIONS.flatMap(noteKeysInReadingOrder)) {
      if (!numbers.has(noteKey)) {
        numbers.set(noteKey, numbers.size + 1);
      }
    }
    return numbers;
  });

  /** The footnotes, in number order. */
  readonly presentedFootnotes = computed<readonly PresentedFootnote[]>(() =>
    [...this.footnoteNumbers()].map(([noteKey, number]) => ({
      number,
      text: this.translationService.translate(noteKey),
    })),
  );

  /** The rows, Tabilinks first. */
  readonly presentedRows = computed<readonly PresentedComparisonRow[]>(() =>
    COMPARED_EXTENSIONS.map((extension) => this.presentRow(extension)),
  );

  /**
   * Words one extension's row.
   *
   * @param extension the extension's findings
   * @returns the row ready to bind
   */
  private presentRow(extension: ComparedExtension): PresentedComparisonRow {
    return {
      name: extension.name,
      storeUrl: extension.storeUrl,
      nameFootnoteMarker: this.footnoteMarkerFor(extension.noteKeys ?? []),
      isTabilinks: extension.price.kind === 'tabilinks',
      cells: [
        ...COMPARED_FEATURES.map((feature) => this.presentFeature(extension.features[feature])),
        { text: this.wordFreeVersionLimits(extension.freeVersionLimits), footnoteMarker: '' },
        { text: this.wordPrice(extension.price), footnoteMarker: '' },
      ],
    };
  }

  /**
   * Words one feature finding.
   *
   * @param finding how far the extension offers the feature
   * @returns the cell
   */
  private presentFeature(finding: FeatureFinding): PresentedComparisonCell {
    return {
      text: this.translationService.translate(`comparison.support.${finding.support}`),
      footnoteMarker: this.footnoteMarkerFor(finding.noteKey ? [finding.noteKey] : []),
    };
  }

  /**
   * Words what an extension's free version allows.
   *
   * @param limits the finding
   * @returns the cell's text
   */
  private wordFreeVersionLimits(limits: FreeVersionLimits): string {
    switch (limits.kind) {
      case 'none':
        return this.translationService.translate('comparison.freeLimits.none');
      case 'unknown':
        return this.translationService.translate('comparison.freeLimits.unknown');
      case 'described':
        return this.translationService.translate(limits.translationKey);
    }
  }

  /**
   * Words what an extension costs.
   *
   * @param price the finding
   * @returns the cell's text
   */
  private wordPrice(price: PriceFinding): string {
    switch (price.kind) {
      case 'free':
        return this.translationService.translate('comparison.prices.free');
      case 'unknown':
        return this.translationService.translate('comparison.prices.unknown');
      case 'tabilinks':
        return this.wordTabilinksPrice();
      case 'paid':
        return this.listAlternatives(price.plans.map((plan) => this.wordPaidPlan(plan)));
    }
  }

  /**
   * Words one paid plan.
   *
   * @param plan the plan
   * @returns such as {@code $44.99 per year}
   */
  private wordPaidPlan(plan: PaidPlan): string {
    return this.translationService.translate(`comparison.prices.${plan.billing}`, {
      price: this.formatAmount(plan.amountMinorUnits, plan.currency),
    });
  }

  /**
   * Joins alternatives the way the reader's language does — {@code A, B, or C} in English,
   * {@code A, B alebo C} in Slovak.
   *
   * @param alternatives the worded alternatives
   * @returns one phrase
   */
  private listAlternatives(alternatives: readonly string[]): string {
    return new Intl.ListFormat(FORMATTING_LOCALES[this.translationService.currentLanguageCode()], {
      type: 'disjunction',
    }).format(alternatives);
  }

  /**
   * Words Tabilinks' own price from the offers on sale, in the reader's chosen currency.
   *
   * <p>Without the offers — while they load, while pre-rendering, or when the payment provider is
   * unreachable — it says the extension is free and premium optional, and names no figure: the
   * site never shows a price it did not get from the provider.</p>
   *
   * @returns the cell's text
   */
  private wordTabilinksPrice(): string {
    const yearlyOffer = this.premiumPricingStore.offerFor('YEARLY_RECURRING');
    const lifetimeOffer = this.premiumPricingStore.offerFor('LIFETIME');
    if (!yearlyOffer || !lifetimeOffer) {
      return this.translationService.translate('comparison.prices.tabilinksWithoutPrice');
    }
    return this.translationService.translate('comparison.prices.tabilinks', {
      yearlyPrice: this.formatAmount(yearlyOffer.amountMinorUnits, yearlyOffer.currency),
      lifetimePrice: this.formatAmount(lifetimeOffer.amountMinorUnits, lifetimeOffer.currency),
    });
  }

  /**
   * Spells a price in the reader's language.
   *
   * @param amountMinorUnits the amount in the currency's minor units
   * @param currency ISO 4217 code
   * @returns such as {@code €7.00}
   */
  private formatAmount(amountMinorUnits: number, currency: string): string {
    return formatPrice(amountMinorUnits, currency, this.translationService.currentLanguageCode());
  }

  /**
   * Joins the numbers of some footnotes into a marker.
   *
   * @param noteKeys translation keys of the footnotes
   * @returns such as {@code 1, 3}; empty for none
   */
  private footnoteMarkerFor(noteKeys: readonly string[]): string {
    const numbers = this.footnoteNumbers();
    return noteKeys.map((noteKey) => numbers.get(noteKey)).join(', ');
  }

  /**
   * Spells the date the comparison was checked, as a calendar date in the reader's language.
   *
   * <p>Formatted in UTC: the date is a calendar day, not an instant, and a reader west of
   * Greenwich would otherwise see the day before.</p>
   *
   * @returns such as {@code 10 October 2026}
   */
  private formatCheckedOnDate(): string {
    return new Intl.DateTimeFormat(
      FORMATTING_LOCALES[this.translationService.currentLanguageCode()],
      { dateStyle: 'long', timeZone: 'UTC' },
    ).format(new Date(COMPARISON_CHECKED_ON));
  }
}

/**
 * Lists an extension's footnotes in the order a reader meets them: the name's first, then the
 * cells' from left to right.
 *
 * @param extension the extension's findings
 * @returns the translation keys of its footnotes, repeats included
 */
function noteKeysInReadingOrder(extension: ComparedExtension): readonly string[] {
  const featureNoteKeys = COMPARED_FEATURES.map(
    (feature) => extension.features[feature].noteKey,
  ).filter((noteKey): noteKey is string => noteKey !== undefined);
  return [...(extension.noteKeys ?? []), ...featureNoteKeys];
}
