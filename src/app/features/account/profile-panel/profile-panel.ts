import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FormFeedback } from '../../../shared/forms/form-feedback/form-feedback';
import { ProfilePanelViewModel } from './profile-panel.view-model';

/**
 * Editing the one profile field the backend allows: the display name.
 */
@Component({
  selector: 'app-profile-panel',
  imports: [ReactiveFormsModule, TranslatePipe, FormFeedback],
  providers: [ProfilePanelViewModel],
  templateUrl: './profile-panel.html',
  styleUrl: './profile-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePanel {
  /** The name the account currently carries, as the parent page loaded it. */
  readonly currentDisplayName = input.required<string>();

  /** State and behaviour of the profile form. */
  protected readonly viewModel = inject(ProfilePanelViewModel);

  /**
   * Keeps the form seeded with the account's current name.
   *
   * <p>An effect rather than a one-off, because the parent page fills the name in only once the
   * account has been fetched, which is after this panel first renders.</p>
   */
  private readonly seedFormWhenAccountArrives = effect(() =>
    this.viewModel.seedWithCurrentDisplayName(this.currentDisplayName()),
  );
}
