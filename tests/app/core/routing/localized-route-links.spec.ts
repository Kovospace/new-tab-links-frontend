import { APPLICATION_ROUTE_LINKS } from '@app/core/routing/application-route-paths';
import { localizeRouteLinks, localizeTipLink } from '@app/core/routing/localized-route-links';

describe('localizeRouteLinks', () => {
  it('leaves every link alone in the default language', () => {
    expect(localizeRouteLinks('en')).toEqual(APPLICATION_ROUTE_LINKS);
  });

  it('moves the public pages into the language folder', () => {
    const slovakLinks = localizeRouteLinks('sk');

    expect(slovakLinks.home).toBe('/sk');
    expect(slovakLinks.tips).toBe('/sk/tips');
    expect(slovakLinks.privacy).toBe('/sk/privacy');
  });

  it('keeps the pages with one address where they are, the backend-pinned ones included', () => {
    const slovakLinks = localizeRouteLinks('sk');

    expect(slovakLinks.login).toBe('/login');
    expect(slovakLinks.account).toBe('/account');
    expect(slovakLinks.resetPassword).toBe('/reset-password');
    expect(slovakLinks.purchaseThankYou).toBe('/thank-you');
  });
});

describe('localizeTipLink', () => {
  it('links a tip in the language asked for', () => {
    expect(localizeTipLink('profiles', 'sk')).toBe('/sk/tips/profiles');
    expect(localizeTipLink('profiles', 'en')).toBe('/tips/profiles');
  });
});
