import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { AdminHeader } from './admin-header/admin-header';
import { AdminFairUseLimitsPageViewModel } from './admin-fair-use-limits-page.view-model';

/**
 * The operator's page of global Fair Use limits: eight numbers, saved together, with a decrease
 * confirmed before it is sent.
 */
@Component({
  selector: 'app-admin-fair-use-limits-page',
  imports: [AdminHeader, FormFeedback, ReactiveFormsModule, TranslatePipe],
  providers: [AdminFairUseLimitsPageViewModel],
  templateUrl: './admin-fair-use-limits-page.html',
  styleUrl: './admin-fair-use-limits-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFairUseLimitsPage implements OnInit {
  /** State and behaviour of the page. */
  protected readonly viewModel = inject(AdminFairUseLimitsPageViewModel);

  /** Loads the limits in force once the component is on screen. */
  ngOnInit(): void {
    this.viewModel.loadLimits();
  }
}
