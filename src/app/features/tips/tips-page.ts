import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TipsPageViewModel } from './tips-page.view-model';

/**
 * Every tip, listed — the longer versions of the one-line tips the extension shows.
 */
@Component({
  selector: 'app-tips-page',
  imports: [RouterLink, TranslatePipe],
  providers: [TipsPageViewModel],
  templateUrl: './tips-page.html',
  styleUrl: './tips-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TipsPage implements OnInit {
  /** State of the tips list. */
  protected readonly viewModel = inject(TipsPageViewModel);

  /** Fetches the list as soon as the page opens. */
  ngOnInit(): void {
    this.viewModel.loadTips();
  }
}
