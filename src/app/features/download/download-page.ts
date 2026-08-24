import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DownloadPageViewModel } from './download-page.view-model';

/**
 * Where the extension is installed from: the Chrome Web Store, or the packaged build this site
 * hosts itself.
 */
@Component({
  selector: 'app-download-page',
  imports: [TranslatePipe],
  providers: [DownloadPageViewModel],
  templateUrl: './download-page.html',
  styleUrl: './download-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadPage {
  /** State of the download page. */
  protected readonly viewModel = inject(DownloadPageViewModel);
}
