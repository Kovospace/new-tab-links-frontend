import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { BackendFailureTranslator } from '../../../core/api/backend-failure.translator';
import { ExtensionConnectCode } from '../../../core/api/models/authentication-request.model';
import { TranslationService } from '../../../core/i18n/translation.service';
import { UserDeviceService } from '../../../core/user/user-device.service';
import { formatInstantForDisplay } from '../../../shared/formatting/instant-formatter';

/**
 * State and behaviour behind the "connect a browser extension" panel.
 *
 * <p>This is where the pairing code lives, and the placement is a decision rather than an
 * accident. The code is not a way <em>in</em>: minting it needs a valid access token, so nobody
 * who is not already signed in can ask for one. Putting it on the registration or login page
 * would mean showing a control that cannot work to exactly the people looking at those pages.
 * It belongs beside the device list, because that is what it produces — one more device.</p>
 *
 * <p>It matters most for accounts created through Google. Those have no password at all, so the
 * extension's username-and-password form can never sign them in; this code is their only route.
 * A password account can use it too, and many will, since typing a nine-character code beats
 * typing a passphrase into a browser popup.</p>
 */
@Injectable()
export class ExtensionConnectPanelViewModel implements OnDestroy {
  /**
   * How long the outcome of a copy stays on screen, in milliseconds.
   *
   * <p>Long enough to be read, short enough that it is gone before the reader wonders whether
   * it refers to the code now in front of them or to the one before it.</p>
   */
  private static readonly COPY_OUTCOME_DURATION_MILLISECONDS = 4000;

  private readonly userDeviceService = inject(UserDeviceService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly mintedCode = signal<ExtensionConnectCode | null>(null);
  private readonly isMinting = signal(false);
  private readonly mintFailureMessage = signal('');
  private readonly copyOutcomeMessage = signal('');
  private copyOutcomeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Whether a code is being minted, which is what disables the button. */
  readonly isGeneratingCode = this.isMinting.asReadonly();

  /** Why a code could not be minted, empty when one could. */
  readonly mintFailure = this.mintFailureMessage.asReadonly();

  /**
   * The result of the last attempt to copy the code, empty when there has not been one.
   *
   * <p>Worded here rather than in the template because it is one of two sentences chosen at
   * runtime, and because it takes itself away again after a few seconds.</p>
   */
  readonly copyOutcome = this.copyOutcomeMessage.asReadonly();

  /** The code to display, empty until one has been minted. */
  readonly connectCode = computed<string>(() => this.mintedCode()?.code ?? '');

  /** Whether there is a code to show at all. */
  readonly hasConnectCode = computed<boolean>(() => this.mintedCode() !== null);

  /**
   * When the code stops working, as a finished sentence.
   *
   * <p>Empty while no code has been minted. Re-worded when the reader switches language, because
   * both the sentence and the date formatting depend on it.</p>
   */
  readonly expiryNotice = computed<string>(() => {
    const currentCode = this.mintedCode();
    if (!currentCode) {
      return '';
    }

    return this.translationService.translate('devices.connectCodeExpiry', {
      expiresAt: formatInstantForDisplay(
        currentCode.expiresAt,
        this.translationService.currentLanguageCode(),
      ),
    });
  });

  /**
   * Mints a fresh code for the user to type into the extension.
   *
   * <p>Each call replaces whatever was on screen. The code is valid for about ten minutes and
   * works exactly once, so minting a new one whenever the user asks is the correct behaviour —
   * there is nothing to preserve.</p>
   */
  generateConnectCode(): void {
    this.isMinting.set(true);
    this.mintFailureMessage.set('');
    this.clearCopyOutcome();

    this.userDeviceService.mintExtensionConnectCode().subscribe({
      next: (extensionConnectCode) => {
        this.mintedCode.set(extensionConnectCode);
        this.isMinting.set(false);
      },
      error: (failure: unknown) => {
        this.isMinting.set(false);
        this.mintFailureMessage.set(this.failureTranslator.describeFailure(failure));
      },
    });
  }

  /**
   * Puts the code on the clipboard, so it can be pasted into the extension rather than typed.
   *
   * <p>Both outcomes are reported, and the failure matters more than it looks. The Clipboard API
   * exists only in a secure context and only with the reader's permission, so a copy can fail for
   * reasons that have nothing to do with this page — and a button that silently does nothing
   * would leave someone waiting for a paste that never comes. The wording tells them to select
   * the code by hand instead, which always works.</p>
   */
  copyConnectCodeToClipboard(): void {
    const codeToCopy = this.connectCode();
    if (!codeToCopy) {
      return;
    }

    const clipboard = navigator.clipboard;
    if (!clipboard) {
      this.announceCopyOutcome('devices.copyCodeFailure');
      return;
    }

    clipboard.writeText(codeToCopy).then(
      () => this.announceCopyOutcome('devices.copyCodeConfirmation'),
      () => this.announceCopyOutcome('devices.copyCodeFailure'),
    );
  }

  /** Cancels a pending acknowledgement, so nothing sets a signal after the panel has gone. */
  ngOnDestroy(): void {
    this.clearCopyOutcome();
  }

  /**
   * Shows one sentence about the copy, and arranges for it to go away again.
   *
   * @param translationKey the sentence to show
   */
  private announceCopyOutcome(translationKey: string): void {
    this.clearCopyOutcome();
    this.copyOutcomeMessage.set(this.translationService.translate(translationKey));
    this.copyOutcomeTimer = setTimeout(
      () => this.copyOutcomeMessage.set(''),
      ExtensionConnectPanelViewModel.COPY_OUTCOME_DURATION_MILLISECONDS,
    );
  }

  /** Takes the acknowledgement away now, cancelling the timer that would have done it later. */
  private clearCopyOutcome(): void {
    if (this.copyOutcomeTimer !== null) {
      clearTimeout(this.copyOutcomeTimer);
      this.copyOutcomeTimer = null;
    }
    this.copyOutcomeMessage.set('');
  }
}
