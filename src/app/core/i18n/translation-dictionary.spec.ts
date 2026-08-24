import { fillPlaceholders, flattenTranslationFile } from './translation-dictionary';

describe('flattenTranslationFile', () => {
  it('flattens nested objects into dotted keys', () => {
    const flattened = flattenTranslationFile({
      nav: { home: 'Home', download: 'Download' },
      site: { title: 'NewTabLinks' },
    });

    expect(flattened.get('nav.home')).toBe('Home');
    expect(flattened.get('nav.download')).toBe('Download');
    expect(flattened.get('site.title')).toBe('NewTabLinks');
  });

  it('flattens arbitrarily deep nesting', () => {
    const flattened = flattenTranslationFile({
      home: { features: { groupsTitle: 'Grouped links' } },
    });

    expect(flattened.get('home.features.groupsTitle')).toBe('Grouped links');
  });

  it('keeps top level keys unprefixed', () => {
    expect(flattenTranslationFile({ standalone: 'value' }).get('standalone')).toBe('value');
  });
});

describe('fillPlaceholders', () => {
  it('substitutes every known placeholder', () => {
    expect(fillPlaceholders('© {year} {author}', { year: 2026, author: 'Matej' })).toBe(
      '© 2026 Matej',
    );
  });

  it('leaves an unknown placeholder visible rather than blanking it', () => {
    expect(fillPlaceholders('© {year} {author}', { year: 2026 })).toBe('© 2026 {author}');
  });

  it('returns the text untouched when there are no values to substitute', () => {
    expect(fillPlaceholders('nothing to fill', undefined)).toBe('nothing to fill');
  });
});
