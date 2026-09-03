import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { AdminUsersPageViewModel } from './admin-users-page.view-model';

/**
 * The operator's repair surface: every account, and what can be done to one.
 *
 * <p>Deliberately plain. This page exists to be usable at the moment something has gone wrong,
 * which is not a moment for anything clever.</p>
 */
@Component({
  selector: 'app-admin-users-page',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback],
  providers: [AdminUsersPageViewModel],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage implements OnInit {
  /** State and behaviour of the account list. */
  protected readonly viewModel = inject(AdminUsersPageViewModel);

  /** Loads the first page once the component is on screen. */
  ngOnInit(): void {
    this.viewModel.loadFirstPage();
  }
}
