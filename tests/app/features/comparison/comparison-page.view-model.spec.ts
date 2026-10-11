import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PremiumOffer } from '@app/core/api/models/premium-offer.model';
import { PremiumPlan } from '@app/core/api/models/subscription.model';
import { PremiumPricingStore } from '@app/core/billing/premium-pricing.store';
import { COMPARED_EXTENSIONS } from '@app/core/comparison/compared-extensions';
import { TranslationService } from '@app/core/i18n/translation.service';
import { ComparisonPageViewModel } from '@app/features/comparison/comparison-page.view-model';

/**
 * How the comparison is worded: footnote numbering, prices, and Tabilinks' own price.
 */
describe('ComparisonPageViewModel', () => {
  const offers = signal<Partial<Record<PremiumPlan, PremiumOffer>>>({});
  let viewModel: ComparisonPageViewModel;

  beforeEach(() => {
    offers.set({});
    TestBed.configureTestingModule({
      providers: [
        ComparisonPageViewModel,
        {
          provide: TranslationService,
          useValue: {
            currentLanguageCode: signal('en'),
            translate: (key: string, values?: Record<string, string>) =>
              values ? `${key} ${JSON.stringify(values)}` : key,
          },
        },
        {
          provide: PremiumPricingStore,
          useValue: { offerFor: (plan: PremiumPlan) => offers()[plan] ?? null },
        },
      ],
    });
    viewModel = TestBed.inject(ComparisonPageViewModel);
  });

  const rowNamed = (name: string) => viewModel.presentedRows().find((row) => row.name === name)!;

  it('lists every extension, Tabilinks first and marked as such', () => {
    const rows = viewModel.presentedRows();
    expect(rows).toHaveLength(COMPARED_EXTENSIONS.length);
    expect(rows[0]).toMatchObject({ name: 'Tabilinks', isTabilinks: true, storeUrl: null });
    expect(rows.slice(1).every((row) => !row.isTabilinks && row.storeUrl)).toBe(true);
  });

  it('gives every row one cell per column header', () => {
    const columnCount = viewModel.dataColumnHeaders().length;
    expect(viewModel.presentedRows().every((row) => row.cells.length === columnCount)).toBe(true);
  });

  it('numbers a footnote shared by several rows once', () => {
    const footnoteTexts = viewModel.presentedFootnotes().map((footnote) => footnote.text);
    expect(new Set(footnoteTexts).size).toBe(footnoteTexts.length);
    expect(rowNamed('Speed Links').nameFootnoteMarker).toBe(
      rowNamed('TabAtrium').nameFootnoteMarker,
    );
  });

  it('numbers footnotes from 1 in the order the table uses them', () => {
    expect(viewModel.presentedFootnotes().map((footnote) => footnote.number)).toEqual(
      viewModel.presentedFootnotes().map((_, index) => index + 1),
    );
    expect(rowNamed('Tabilinks').cells[5].footnoteMarker).toBe('1');
  });

  it('lists every paid plan of a competitor as alternatives', () => {
    expect(rowNamed('Speed Dial (FVD)').cells.at(-1)!.text).toBe(
      'comparison.prices.monthly {"price":"$15.00"}, ' +
        'comparison.prices.yearly {"price":"$44.99"} or ' +
        'comparison.prices.lifetime {"price":"$129.00"}',
    );
  });

  it("formats a competitor's price in the reader's language", () => {
    expect(rowNamed('Speed Links').cells.at(-1)!.text).toBe(
      'comparison.prices.lifetime {"price":"€7.00"}',
    );
  });

  it('names no Tabilinks price until the offers are known', () => {
    expect(rowNamed('Tabilinks').cells.at(-1)!.text).toBe(
      'comparison.prices.tabilinksWithoutPrice',
    );

    offers.set({
      YEARLY_RECURRING: {
        plan: 'SUBSCRIPTION',
        currency: 'EUR',
        amountMinorUnits: 468,
        billingPeriod: 'every-year',
      },
      LIFETIME: { plan: 'LIFETIME', currency: 'EUR', amountMinorUnits: 1900, billingPeriod: null },
    });

    expect(rowNamed('Tabilinks').cells.at(-1)!.text).toBe(
      'comparison.prices.tabilinks {"yearlyPrice":"€4.68","lifetimePrice":"€19.00"}',
    );
  });
});
