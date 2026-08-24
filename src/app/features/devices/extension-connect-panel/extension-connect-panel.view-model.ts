import { Injectable, computed, inject, signal } from '@angular/core';
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
export class ExtensionConnectPanelViewModel {
  private readonly userDeviceService = inject(UserDeviceService);
  private readonly translationService = inject(TranslationService);
  private readonly failureTranslator = inject(BackendFailureTranslator);

  private readonly mintedCode = signal<ExtensionConnectCode | null>(null);
  private readonly isMinting = signal(false);
  private readonly mintFailureMessage = signal('');

  /** Whether a code is being minted, which is what disables the button. */
  readonly isGeneratingCode = this.isMinting.asReadonly();

  /** Why a code could not be minted, empty when one could. */
  readonly mintFailure = this.mintFailureMessage.asReadonly();

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
}
