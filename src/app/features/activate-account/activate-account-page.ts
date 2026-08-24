import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { APPLICATION_ROUTE_LINKS } from '../../core/routing/application-route-paths';
import { FormFeedback } from '../../shared/forms/form-feedback/form-feedback';
import { ActivateAccountPageViewModel } from './activate-account-page.view-model';

/**
 * The far end of the activation link mailed after registration.
 */
@Component({
  selector: 'app-activate-account-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, FormFeedback],
  providers: [ActivateAccountPageViewModel],
  templateUrl: './activate-account-page.html',
  styleUrl: './activate-account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivateAccountPage implements OnInit {
  /** State and behaviour of the activation page. */
  protected readonly viewModel = inject(ActivateAccountPageViewModel);

  /** Where an activated user is pointed next. */
  protected readonly loginLink = APPLICATION_ROUTE_LINKS.login;

  /**
   * Starts the activation as soon as the page opens.
   */
  ngOnInit(): void {
    this.viewModel.activateFromLink();
  }
}
