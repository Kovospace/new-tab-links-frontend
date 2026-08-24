import { formatInstantForDisplay } from './instant-formatter';

describe('formatInstantForDisplay', () => {
  it('spells a UTC instant out in the reader s language', () => {
    const formatted = formatInstantForDisplay('2026-08-24T10:15:30Z', 'en');

    expect(formatted).toContain('2026');
    expect(formatted).toContain('August');
  });

  it('uses the Slovak spelling for Slovak', () => {
    const formatted = formatInstantForDisplay('2026-08-24T10:15:30Z', 'sk');

    expect(formatted).toContain('2026');
    expect(formatted).not.toContain('August');
  });

  it('returns an empty string for a missing value rather than the word null', () => {
    expect(formatInstantForDisplay(null, 'en')).toBe('');
    expect(formatInstantForDisplay(undefined, 'en')).toBe('');
    expect(formatInstantForDisplay('', 'en')).toBe('');
  });

  it('returns an empty string for a value that is not a date', () => {
    expect(formatInstantForDisplay('not a date at all', 'en')).toBe('');
  });
});
