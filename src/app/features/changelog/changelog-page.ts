import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChangelogPageViewModel } from './changelog-page.view-model';

/**
 * Every released version of the extension, newest first, each with its most important changes and
 * a link to the full notes.
 */
@Component({
  selector: 'app-changelog-page',
  imports: [RouterLink, TranslatePipe],
  providers: [ChangelogPageViewModel],
  templateUrl: './changelog-page.html',
  styleUrl: './changelog-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogPage implements OnInit {
  /** State of the list. */
  protected readonly viewModel = inject(ChangelogPageViewModel);

  /** Fetches the list as soon as the page opens. */
  ngOnInit(): void {
    this.viewModel.loadReleases();
  }
}
