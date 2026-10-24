import { describe, expect, it } from 'vitest';
import { normalizeForTipSearch, tipMatchesSearch } from '@app/core/tips/tip-search';

/**
 * The tips search matches every word, anywhere in the title or text, ignoring case and diacritics.
 */
describe('tipMatchesSearch', () => {
  const tip = {
    slug: 'subgroup-links-into-tab-group',
    title: 'Zachytávanie odkazov z podskupiny do skupiny kariet',
    text: 'Ťahaj a pusť odkazy do skupiny kariet.',
  };

  it('matches a query typed without diacritics or capitals', () => {
    expect(tipMatchesSearch(tip, 'ZACHYTAVANIE')).toBe(true);
    expect(tipMatchesSearch(tip, 'tahaj')).toBe(true);
  });

  it('needs every word of the query, in any order, across title and text', () => {
    expect(tipMatchesSearch(tip, 'pusť zachytávanie')).toBe(true);
    expect(tipMatchesSearch(tip, 'zachytávanie história')).toBe(false);
  });

  it('matches every tip when the query is blank', () => {
    expect(tipMatchesSearch(tip, '   ')).toBe(true);
  });
});

describe('normalizeForTipSearch', () => {
  it('drops the marks Slovak letters carry', () => {
    expect(normalizeForTipSearch('Ľúbostné Ťahanie')).toBe('lubostne tahanie');
  });
});
