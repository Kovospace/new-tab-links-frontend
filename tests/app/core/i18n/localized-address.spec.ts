import { localizeAddress, splitLanguagePrefix } from '@app/core/i18n/localized-address';

describe('localizeAddress', () => {
  it('keeps the default language at the address it always had', () => {
    expect(localizeAddress('/tips?x=1', 'en')).toBe('/tips?x=1');
  });

  it('puts another language one folder down, query and fragment kept', () => {
    expect(localizeAddress('/tips/profiles?x=1#top', 'sk')).toBe('/sk/tips/profiles?x=1#top');
  });

  it('gives the home page the bare folder, without a trailing slash', () => {
    expect(localizeAddress('/', 'sk')).toBe('/sk');
    expect(localizeAddress('/?x=1', 'sk')).toBe('/sk?x=1');
  });
});

describe('splitLanguagePrefix', () => {
  it('takes a language folder off', () => {
    expect(splitLanguagePrefix('/sk/tips?x=1')).toEqual({
      languageCode: 'sk',
      unprefixedAddress: '/tips?x=1',
    });
  });

  it('reads the bare folder as that language home page', () => {
    expect(splitLanguagePrefix('/sk')).toEqual({ languageCode: 'sk', unprefixedAddress: '/' });
  });

  it('finds no prefix on a default-language address', () => {
    expect(splitLanguagePrefix('/tips')).toEqual({
      languageCode: null,
      unprefixedAddress: '/tips',
    });
  });

  it('never reads the default language as a prefix, since none is ever written', () => {
    expect(splitLanguagePrefix('/en/tips').languageCode).toBeNull();
  });

  it('does not mistake a page starting with the same letters for a language', () => {
    expect(splitLanguagePrefix('/skills').languageCode).toBeNull();
  });

  it('undoes localizeAddress', () => {
    const address = '/tips/profiles?x=1';
    expect(splitLanguagePrefix(localizeAddress(address, 'sk')).unprefixedAddress).toBe(address);
  });
});
