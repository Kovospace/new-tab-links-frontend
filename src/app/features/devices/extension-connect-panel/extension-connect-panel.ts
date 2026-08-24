import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ExtensionConnectPanelViewModel } from './extension-connect-panel.view-model';

/**
 * Mints and displays the code that signs a browser extension in.
 *
 * <p>Its own component beside the device list, because it is its own job with its own state —
 * see {@link ExtensionConnectPanelViewModel} for why it sits here and not on the login page.</p>
 */
@Component({
  selector: 'app-extension-connect-panel',
  imports: [TranslatePipe],
  providers: [ExtensionConnectPanelViewModel],
  templateUrl: './extension-connect-panel.html',
  styleUrl: './extension-connect-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExtensionConnectPanel {
  /** State and behaviour of the panel. */
  protected readonly viewModel = inject(ExtensionConnectPanelViewModel);
}
