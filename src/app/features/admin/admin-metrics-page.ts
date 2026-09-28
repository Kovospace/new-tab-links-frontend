import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminHeader } from './admin-header/admin-header';
import { AdminMetricsPageViewModel } from './admin-metrics-page.view-model';

/**
 * The operator's usage statistics: new tabs opened and website visitors, a month at a time.
 */
@Component({
  selector: 'app-admin-metrics-page',
  imports: [AdminHeader, TranslatePipe],
  providers: [AdminMetricsPageViewModel],
  templateUrl: './admin-metrics-page.html',
  styleUrl: './admin-metrics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMetricsPage implements OnInit {
  /** State and behaviour of the statistics page. */
  protected readonly viewModel = inject(AdminMetricsPageViewModel);

  /** Loads the current month once the component is on screen. */
  ngOnInit(): void {
    this.viewModel.loadDisplayedMonth();
  }
}
