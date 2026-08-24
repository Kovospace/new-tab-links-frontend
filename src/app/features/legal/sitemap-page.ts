import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SitemapPageViewModel } from './sitemap-page.view-model';

/**
 * Every page of this site, in one list.
 */
@Component({
  selector: 'app-sitemap-page',
  imports: [RouterLink, TranslatePipe],
  providers: [SitemapPageViewModel],
  templateUrl: './sitemap-page.html',
  styleUrl: './sitemap-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SitemapPage {
  /** State of the sitemap. */
  protected readonly viewModel = inject(SitemapPageViewModel);
}
