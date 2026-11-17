import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { AdminHeader } from './admin-header/admin-header';
import { AdminUserDetailPageViewModel } from './admin-user-detail-page.view-model';

/**
 * One account in the operator's area: who it is, and its raised Fair Use limits.
 */
@Component({
  selector: 'app-admin-user-detail-page',
  imports: [AdminHeader, FormFeedback, ReactiveFormsModule, TranslatePipe],
  providers: [AdminUserDetailPageViewModel],
  templateUrl: './admin-user-detail-page.html',
  styleUrl: './admin-user-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDetailPage implements OnInit {
  /** State and behaviour of the page. */
  protected readonly viewModel = inject(AdminUserDetailPageViewModel);

  /** Loads the account once the component is on screen. */
  ngOnInit(): void {
    this.viewModel.load();
  }
}
