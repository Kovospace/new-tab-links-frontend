import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ExtensionConnectPanel } from './extension-connect-panel/extension-connect-panel';
import { DevicesPageViewModel } from './devices-page.view-model';

/**
 * Where the account has been signed in from, and how to connect one more browser.
 */
@Component({
  selector: 'app-devices-page',
  imports: [TranslatePipe, ExtensionConnectPanel],
  providers: [DevicesPageViewModel],
  templateUrl: './devices-page.html',
  styleUrl: './devices-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DevicesPage implements OnInit {
  /** State and behaviour of the device list. */
  protected readonly viewModel = inject(DevicesPageViewModel);

  /**
   * Fetches the device list as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.loadDevices();
  }
}
