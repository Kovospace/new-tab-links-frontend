import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AdminHeaderViewModel } from './admin-header.view-model';

/**
 * The bar at the top of every operator page: the pages, the session's expiry, and sign-out.
 */
@Component({
  selector: 'app-admin-header',
  imports: [RouterLink, TranslatePipe],
  providers: [AdminHeaderViewModel],
  templateUrl: './admin-header.html',
  styleUrl: './admin-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminHeader {
  /** State and behaviour of the header. */
  protected readonly viewModel = inject(AdminHeaderViewModel);
}
