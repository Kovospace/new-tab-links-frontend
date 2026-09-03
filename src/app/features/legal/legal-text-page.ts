import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BackButton } from '../../shared/layout/back-button/back-button';
import { LegalTextPageViewModel } from './legal-text-page.view-model';

/**
 * A page of plain compliance text — the privacy statement and the cookie statement both.
 *
 * <p>Which text it shows comes from the route, so adding a third such page is a route entry and
 * two translation keys, with no new component.</p>
 */
@Component({
  selector: 'app-legal-text-page',
  imports: [BackButton, TranslatePipe],
  providers: [LegalTextPageViewModel],
  templateUrl: './legal-text-page.html',
  styleUrl: './legal-text-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalTextPage {
  /** State of the page. */
  protected readonly viewModel = inject(LegalTextPageViewModel);
}
