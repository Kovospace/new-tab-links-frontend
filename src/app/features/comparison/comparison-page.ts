import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BackButton } from '../../shared/layout/back-button/back-button';
import { ComparisonPageViewModel } from './comparison-page.view-model';

/**
 * Tabilinks next to other new tab extensions, feature by feature, in one table.
 */
@Component({
  selector: 'app-comparison-page',
  imports: [BackButton, TranslatePipe],
  providers: [ComparisonPageViewModel],
  templateUrl: './comparison-page.html',
  styleUrl: './comparison-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonPage {
  /** State of the comparison. */
  protected readonly viewModel = inject(ComparisonPageViewModel);
}
