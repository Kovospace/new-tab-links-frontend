import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { DeviceDetailPageViewModel } from './device-detail-page.view-model';

/**
 * One device: which of its profiles and workspaces synchronise, and how much each holds.
 */
@Component({
  selector: 'app-device-detail-page',
  imports: [RouterLink, TranslatePipe],
  providers: [DeviceDetailPageViewModel],
  templateUrl: './device-detail-page.html',
  styleUrl: './device-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceDetailPage implements OnInit {
  /** State behind the page. */
  protected readonly viewModel = inject(DeviceDetailPageViewModel);

  /** Fetches the device and its report as soon as the page opens. */
  ngOnInit(): void {
    this.viewModel.loadDetail();
  }
}
