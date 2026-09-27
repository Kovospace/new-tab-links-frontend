import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, take, takeWhile, timer } from 'rxjs';
import { AuthenticationSessionStore } from '../../core/auth/authentication-session.store';
import { PremiumStanding } from '../../core/billing/premium-standing';
import { PremiumStandingService } from '../../core/billing/premium-standing.service';
import { TranslationService } from '../../core/i18n/translation.service';

/**
 * Where the confirmation of a purchase stands, as the page tells it.
 *
 * <ul>
 *   <li>{@code CHECKING} — still asking whether the account is premium yet.</li>
 *   <li>{@code CONFIRMED_SUBSCRIPTION} / {@code CONFIRMED_LIFETIME} — it is, and this is how.</li>
 *   <li>{@code STILL_PENDING} — every attempt came back not premium; the payment is most likely
 *   still on its way.</li>
 *   <li>{@code SIGNED_OUT} — nobody is signed in, so there is no account to ask about.</li>
 * </ul>
 */
export type PurchaseConfirmation =
  'CHECKING' | 'CONFIRMED_SUBSCRIPTION' | 'CONFIRMED_LIFETIME' | 'STILL_PENDING' | 'SIGNED_OUT';

/** How often the account is asked again while the payment is being confirmed. */
export const CONFIRMATION_POLL_INTERVAL_MILLISECONDS = 3000;

/** How many times it is asked before the page stops waiting: about half a minute. */
export const CONFIRMATION_POLL_ATTEMPTS = 10;

/**
 * State behind the page a buyer lands on after paying.
 *
 * <p><strong>The return itself proves nothing.</strong> The payment provider appends its own
 * query parameters to this address, and the page ignores them on purpose: anybody can type them,
 * and what makes an account premium is the provider's signed webhook reaching the backend — never
 * the browser coming back. So the page asks the backend, the one place that knows.</p>
 *
 * <p>It asks more than once because the two race. The buyer is redirected the moment the payment
 * succeeds, and the webhook usually arrives a few seconds later. Asking once would tell most
 * buyers their payment had not arrived, which is the one thing a thank-you page must not say by
 * mistake. After about half a minute it stops and says the confirmation is on its way — true, and
 * nothing is lost: the account turns premium whenever the webhook lands.</p>
 */
@Injectable()
export class PurchaseThankYouPageViewModel {
  private readonly sessionStore = inject(AuthenticationSessionStore);
  private readonly premiumStandingService = inject(PremiumStandingService);
  private readonly translationService = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly currentConfirmation = signal<PurchaseConfirmation>('CHECKING');

  /** Where the confirmation stands; the template picks its links from this. */
  readonly confirmation = this.currentConfirmation.asReadonly();

  /** The sentence under the heading, in the reader's language. */
  readonly confirmationMessage = computed<string>(() =>
    this.translationService.translate(`purchaseThankYou.confirmation.${this.confirmation()}`),
  );

  /** Whether the account is confirmed premium, which is what offers the next steps. */
  readonly isConfirmed = computed<boolean>(() => this.confirmation().startsWith('CONFIRMED'));

  /**
   * Starts asking whether the purchase has reached the account.
   *
   * <p>Stops at the first answer that says premium, after {@link CONFIRMATION_POLL_ATTEMPTS}
   * answers that do not, or when the page is left.</p>
   */
  confirmPurchase(): void {
    if (!this.sessionStore.isSignedIn()) {
      this.currentConfirmation.set('SIGNED_OUT');
      return;
    }

    let answersSoFar = 0;
    timer(0, CONFIRMATION_POLL_INTERVAL_MILLISECONDS)
      .pipe(
        take(CONFIRMATION_POLL_ATTEMPTS),
        switchMap(() => this.premiumStandingService.loadPremiumStanding()),
        takeWhile((premiumStanding) => !isPremium(premiumStanding), true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((premiumStanding) => {
        answersSoFar += 1;
        this.currentConfirmation.set(
          describeConfirmation(premiumStanding, answersSoFar >= CONFIRMATION_POLL_ATTEMPTS),
        );
      });
  }
}

/**
 * Whether a standing means the purchase has arrived.
 *
 * @param premiumStanding where the account stands
 * @returns true for a subscriber or a lifetime buyer
 */
function isPremium(premiumStanding: PremiumStanding): boolean {
  return premiumStanding === 'SUBSCRIBED' || premiumStanding === 'LIFETIME';
}

/**
 * Words one answer as the page's confirmation.
 *
 * @param premiumStanding the latest answer
 * @param isLastAttempt whether the page has stopped asking
 * @returns the confirmation to show
 */
function describeConfirmation(
  premiumStanding: PremiumStanding,
  isLastAttempt: boolean,
): PurchaseConfirmation {
  if (premiumStanding === 'LIFETIME') {
    return 'CONFIRMED_LIFETIME';
  }
  if (premiumStanding === 'SUBSCRIBED') {
    return 'CONFIRMED_SUBSCRIPTION';
  }
  return isLastAttempt ? 'STILL_PENDING' : 'CHECKING';
}
