import { describe, expect, it } from 'vitest';
import { describeCurrency, formatPrice } from '@app/shared/formatting/price-formatter';

/**
 * Prices in each language, with nothing about any currency written into the formatter — so one
 * the payment provider adds later needs no change.
 */
describe('formatPrice', () => {
  it('writes a price the way each language does', () => {
    expect(formatPrice(468, 'EUR', 'en')).toBe('€4.68');
    expect(formatPrice(468, 'EUR', 'sk').replace(/\s/g, ' ')).toBe('4,68 €');
    expect(formatPrice(1599, 'USD', 'en')).toBe('$15.99');
  });

  it("takes a currency's minor units from Intl, not from an assumed hundred", () => {
    expect(formatPrice(500, 'JPY', 'en')).toBe('¥500');
  });

  it('falls back to the bare code for a currency Intl does not know', () => {
    expect(formatPrice(100, 'NOT-A-CODE', 'en')).toBe('100 NOT-A-CODE');
  });
});

describe('describeCurrency', () => {
  it('names a currency by symbol and code, and in full', () => {
    expect(describeCurrency('EUR', 'en')).toEqual({ shortLabel: '€ EUR', name: 'Euro' });
  });
});
