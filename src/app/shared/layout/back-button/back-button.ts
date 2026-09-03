import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BackButtonViewModel } from './back-button.view-model';

/**
 * A button returning the reader to where they came from.
 *
 * <p>For the pages that no menu leads to — the compliance texts and the sitemap, all reached from
 * the footer — this is the only way back that does not require the reader to work out for
 * themselves which of the site's sections they were in.</p>
 *
 * <p>It carries no stylesheet of its own: it is one ordinary button and takes the site's button
 * look from {@code styles.scss}.</p>
 */
@Component({
  selector: 'app-back-button',
  imports: [TranslatePipe],
  providers: [BackButtonViewModel],
  templateUrl: './back-button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButton {
  /** Where back goes. */
  protected readonly viewModel = inject(BackButtonViewModel);
}
