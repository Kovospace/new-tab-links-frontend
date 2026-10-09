import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { NO_SUBSCRIPTION, SubscriptionStatus } from '@app/core/api/models/subscription.model';
import { UserAccount } from '@app/core/api/models/user-account.model';
import { TranslationService } from '@app/core/i18n/translation.service';
import { AccountPageViewModel } from '@app/features/account/account-page.view-model';

/** A premium account; each test decides what stands behind the flag. */
const PREMIUM_ACCOUNT: UserAccount = {
  id: 'u1',
  username: 'reader',
  email: 'reader@example.com',
  displayName: 'Reader',
  status: 'ACTIVE',
  hasPassword: true,
  premium: true,
  createdAt: '2026-01-05T08:00:00Z',
  updatedAt: '2026-01-05T08:00:00Z',
};

/** A lifetime licence the reader paid for. */
const PURCHASED_LIFETIME: SubscriptionStatus = {
  ...NO_SUBSCRIPTION,
  plan: 'LIFETIME',
  state: 'ACTIVE',
  startedAt: '2026-03-01T10:00:00Z',
};

/** The wording under test. */
const TRANSLATIONS = {
  account: {
    grant: {
      heading: 'Full version granted',
      lifetime: 'Granted for life.',
      until: 'Granted until {date}.',
    },
    lifetime: {
      heading: 'Lifetime full version',
      held: 'You own it.',
      heldSince: 'You own it since {date}.',
    },
  },
};

describe('AccountPageViewModel', () => {
  let viewModel: AccountPageViewModel;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AccountPageViewModel,
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });
    viewModel = TestBed.inject(AccountPageViewModel);
    httpTestingController = TestBed.inject(HttpTestingController);

    const loadingEnglish = TestBed.inject(TranslationService).changeLanguage('en');
    httpTestingController.expectOne('i18n/en.json').flush(TRANSLATIONS);
    await loadingEnglish;
  });

  afterEach(() => httpTestingController.verify());

  /**
   * Loads the page and answers both of its requests.
   *
   * @param account the signed-in account
   * @param subscription what stands behind its premium flag
   */
  function loadWith(account: UserAccount, subscription: SubscriptionStatus): void {
    viewModel.loadAccount();
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/users/me'))
      .flush(account);
    httpTestingController
      .expectOne((request) => request.url.endsWith('/api/v1/payments/subscription'))
      .flush(subscription);
  }

  it('tells a lifetime buyer they own the full version, with the date they bought it', () => {
    loadWith(PREMIUM_ACCOUNT, PURCHASED_LIFETIME);

    const notice = viewModel.heldPremiumNotice();
    expect(notice?.heading).toBe('Lifetime full version');
    expect(notice?.text).toMatch(/^You own it since .+\.$/);
    expect(viewModel.canPurchasePremium()).toBe(false);
  });

  it('still tells a lifetime buyer when the backend sends no purchase date', () => {
    loadWith(PREMIUM_ACCOUNT, { ...PURCHASED_LIFETIME, startedAt: null });

    expect(viewModel.heldPremiumNotice()?.text).toBe('You own it.');
  });

  it('calls a lifetime grant a grant, not a purchase', () => {
    loadWith(PREMIUM_ACCOUNT, { ...PURCHASED_LIFETIME, grantedByOperator: true });

    expect(viewModel.heldPremiumNotice()).toEqual({
      heading: 'Full version granted',
      text: 'Granted for life.',
    });
  });

  it('says nothing to a subscriber or to a free account', () => {
    loadWith(PREMIUM_ACCOUNT, {
      ...NO_SUBSCRIPTION,
      plan: 'YEARLY_RECURRING',
      state: 'ACTIVE',
      validUntil: '2027-03-01T10:00:00Z',
    });
    expect(viewModel.heldPremiumNotice()).toBeNull();

    loadWith({ ...PREMIUM_ACCOUNT, premium: false }, PURCHASED_LIFETIME);
    expect(viewModel.heldPremiumNotice()).toBeNull();
  });
});
