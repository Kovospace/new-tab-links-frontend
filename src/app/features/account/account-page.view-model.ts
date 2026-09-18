import { Injectable, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../core/api/backend-failure.translator';
import { NO_SUBSCRIPTION, SubscriptionStatus } from '../../core/api/models/subscription.model';
import { UserAccount } from '../../core/api/models/user-account.model';
import { SubscriptionService } from '../../core/billing/subscription.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { UserAccountService } from '../../core/user/user-account.service';
import { formatInstantForDisplay } from '../../shared/formatting/instant-formatter';

/**
 * The account's read-only facts, already worded and formatted.
 */
export interface PresentedAccountDetails {
  /** Name the user signs in with. */
  readonly username: string;
  /** Address identifying the account. */
  readonly email: string;
  /** Lifecycle state of the account, in words. */
  readonly statusLabel: string;
  /** When the account was created, spelled out in the reader's language. */
  readonly createdAtLabel: string;
}

/**
 * State behind the account page.
 *
 * <p>Owns only what the whole page shares: the account itself and the read-only facts drawn from
 * it. Each editable part of the page — the display name, the password, deleting the account — is
 * its own panel with its own view-model, because they fail, succeed and reset independently and
 * folding them together would produce one class that does four unrelated things.</p>
 */
@Injectable()
export class AccountPageViewModel {
  private readonly userAccountService = inject(UserAccountService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly loadedAccount = signal<UserAccount | null>(null);
  private readonly loadedSubscription = signal<SubscriptionStatus>(NO_SUBSCRIPTION);
  private readonly isLoadingAccount = signal(false);
  private readonly loadFailureMessage = signal('');

  /** Whether the account is being fetched. */
  readonly isLoading = this.isLoadingAccount.asReadonly();

  /** Why the account could not be shown, empty when it could. */
  readonly loadFailure = this.loadFailureMessage.asReadonly();

  /** Whether there is an account to render at all. */
  readonly hasAccount = computed<boolean>(() => this.loadedAccount() !== null);

  /**
   * Whether the account already has a password.
   *
   * <p>Decides whether the password panel offers "set" or "change": an account created through
   * Google has none, and its owner gives it one without proving an old one.</p>
   */
  readonly hasPassword = computed<boolean>(() => this.loadedAccount()?.hasPassword ?? false);

  /**
   * Whether to offer the purchase form.
   *
   * <p>Read from the account's own {@code premium} flag — the single place that answers "is this
   * user premium" — and not worked out from the subscription's dates. Comparing
   * {@code validUntil} against {@code Date.now()} here would put the decision on a clock the user
   * owns, and it could not see a grace period, an operator's manual grant, or a refund the server
   * has already acted on.</p>
   *
   * <p>An account loaded from a backend that does not send the flag yet reads as not premium,
   * which is the right answer while nothing can be bought.</p>
   */
  readonly canPurchasePremium = computed<boolean>(() => !this.loadedAccount()?.premium);

  /**
   * Whether to offer cancelling.
   *
   * <p>The backend's own flag, because the rule behind it is not one this side should be
   * restating: a lifetime purchase has nothing to renew, and a subscription already cancelled
   * must not be cancellable twice.</p>
   */
  readonly canCancelSubscription = computed<boolean>(() => this.loadedSubscription().cancellable);

  /**
   * Whether to offer withdrawing from the purchase.
   *
   * <p>The backend's own flag again, and here the reason is sharpest: the 14-day window is a
   * deadline, so deciding it on this side would decide it against a clock the user controls.
   * Someone whose window closed yesterday could reopen it by setting their system date back.</p>
   */
  readonly canRequestRefund = computed<boolean>(() => this.loadedSubscription().refundable);

  /** When the refund window closes, for the refund panel to spell out. */
  readonly refundableUntil = computed<string | null>(
    () => this.loadedSubscription().refundableUntil,
  );

  /** The display name to seed the profile form with. */
  readonly currentDisplayName = computed<string>(() => this.loadedAccount()?.displayName ?? '');

  /** The read-only facts, ready to render. */
  readonly presentedDetails = computed<PresentedAccountDetails | null>(() => {
    const account = this.loadedAccount();
    if (!account) {
      return null;
    }

    return {
      username: account.username,
      email: account.email,
      statusLabel: this.translationService.translate(`account.status.${account.status}`),
      createdAtLabel: formatInstantForDisplay(
        account.createdAt,
        this.translationService.currentLanguageCode(),
      ),
    };
  });

  /**
   * Fetches the signed-in account.
   */
  loadAccount(): void {
    this.isLoadingAccount.set(true);
    this.loadFailureMessage.set('');

    this.userAccountService.loadMyAccount().subscribe({
      next: (userAccount) => {
        this.loadedAccount.set(userAccount);
        this.isLoadingAccount.set(false);
      },
      error: (failure: unknown) => {
        this.isLoadingAccount.set(false);
        this.loadFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });

    this.loadSubscription();
  }

  /**
   * Fetches the account's premium standing.
   *
   * <p>A second call rather than part of the account, because the backend serves it from a
   * separate billing endpoint — {@code UserDto} is embedded in the sync snapshot the Chrome
   * extension pulls, and billing state has no business travelling there.</p>
   *
   * <p>A failure here is swallowed on purpose, leaving the "nothing bought" state standing. The
   * account page's job is the account; if billing cannot be reached, showing the purchase form is
   * a better answer than replacing the whole page with an error about a subscription the reader
   * may not even have. The purchase attempt itself will report any real problem.</p>
   */
  private loadSubscription(): void {
    this.subscriptionService.loadMySubscription().subscribe({
      next: (subscription) => this.loadedSubscription.set(subscription),
      error: () => this.loadedSubscription.set(NO_SUBSCRIPTION),
    });
  }
}
