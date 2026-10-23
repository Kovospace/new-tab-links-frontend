import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * The walkthrough of what the extension does, opened by "Take the tour" on the home page and from
 * the header.
 *
 * <p>Only its heading so far: the content is the owner's to write. No view-model yet, like the
 * not-found page — there is nothing to derive until the page shows something loaded.</p>
 */
@Component({
  selector: 'app-tour-page',
  imports: [TranslatePipe],
  templateUrl: './tour-page.html',
  styleUrl: './tour-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TourPage {}
