import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BackendFailureTranslator } from '../../../core/api/backend-failure.translator';
import { LocalizedRouteLinks } from '../../../core/routing/localized-route-links';
import { UserAccountService } from '../../../core/user/user-account.service';

/**
 * State and behaviour behind deleting an account.
 *
 * <p>Deletion takes every environment, group, subgroup and link the account owns with it and
 * cannot be undone, so it is behind a two-step confirmation: the first press only reveals the
 * second. That is the cheapest guard that actually stops a misplaced click.</p>
 */
@Injectable()
export class DeleteAccountPanelViewModel {
  private readonly userAccountService = inject(UserAccountService);
  private readonly failureTranslator = inject(BackendFailureTranslator);
  private readonly router = inject(Router);
  private readonly localizedRouteLinks = inject(LocalizedRouteLinks);

  private readonly isConfirming = signal(false);
  private readonly isDeleting = signal(false);
  private readonly deleteFailureMessage = signal('');

  /** Whether the confirmation step is showing. */
  readonly isConfirmationRequested = this.isConfirming.asReadonly();

  /** Whether the deletion is in flight, which is what disables the confirm button. */
  readonly isDeletionInFlight = this.isDeleting.asReadonly();

  /** Why the deletion failed, empty when it has not. */
  readonly deleteFailure = this.deleteFailureMessage.asReadonly();

  /**
   * Reveals the confirmation step.
   */
  requestConfirmation(): void {
    this.isConfirming.set(true);
    this.deleteFailureMessage.set('');
  }

  /**
   * Hides the confirmation step, leaving the account alone.
   */
  cancelConfirmation(): void {
    this.isConfirming.set(false);
  }

  /**
   * Deletes the account and leaves for the home page.
   *
   * <p>The session is ended by the account service as soon as the backend confirms, because the
   * tokens are worthless the moment the account is gone.</p>
   */
  confirmDeletion(): void {
    this.isDeleting.set(true);
    this.deleteFailureMessage.set('');

    this.userAccountService.deleteMyAccount().subscribe({
      next: () => {
        this.isDeleting.set(false);
        void this.router.navigateByUrl(this.localizedRouteLinks.links().home);
      },
      error: (failure: unknown) => {
        this.isDeleting.set(false);
        this.deleteFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }
}
