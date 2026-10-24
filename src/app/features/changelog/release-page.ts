import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RenderedMarkdown } from '../../shared/content/rendered-markdown/rendered-markdown';
import { ReleasePageViewModel } from './release-page.view-model';

/**
 * One release of the extension: its full notes, as written in its markdown file.
 *
 * <p>How the notes look is {@link RenderedMarkdown}'s.</p>
 */
@Component({
  selector: 'app-release-page',
  imports: [RouterLink, TranslatePipe, RenderedMarkdown],
  providers: [ReleasePageViewModel],
  templateUrl: './release-page.html',
  styleUrl: './release-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleasePage {
  /** State of the release page. */
  protected readonly viewModel = inject(ReleasePageViewModel);
}
