import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import {
  Observable,
  catchError,
  concat,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';
import { REGISTRATION_FIELD_CONSTRAINTS } from '../../core/api/models/registration.model';
import { RUNTIME_CONFIGURATION } from '../../core/config/runtime-configuration';
import { AuthenticationService } from '../../core/auth/authentication.service';
import { UsernameExistenceService } from '../../core/auth/username-existence.service';
import { AbstractFormViewModel } from '../../shared/forms/abstract-form.view-model';
import { createFormValidationMessagesSignal } from '../../shared/forms/form-validation-messages.signal';

/** Wording this page prefers over the default for a status the backend uses meaningfully here. */
const REGISTRATION_FAILURE_WORDING = {
  409: 'errors.usernameTaken',
  429: 'errors.tooManyRequests',
} as const;

/**
 * Fails the control it is put on unless it holds exactly what the password field holds.
 *
 * <p>Written as a validator on the confirmation field rather than on the form, so that the
 * message appears under the field the user has to fix — the per-field machinery every other form
 * on this site uses only looks at controls.</p>
 *
 * <p>It reads its sibling through {@code parent}, which is null until the control is added to
 * the group; that first call is treated as "nothing to compare yet" rather than as a failure.</p>
 *
 * @param confirmationControl the repeat-password control being validated
 * @returns a {@code passwordMismatch} error, or null when the two agree
 */
function matchesTheChosenPassword(confirmationControl: AbstractControl): ValidationErrors | null {
  const chosenPassword = confirmationControl.parent?.get('password')?.value as string | undefined;

  if (chosenPassword === undefined || chosenPassword === confirmationControl.value) {
    return null;
  }
  return { passwordMismatch: true };
}

/**
 * What is currently known about the typed username.
 *
 * <p>{@code unchecked} covers every reason there is nothing to say — nothing typed yet, what is
 * typed cannot be a username anyway, no API key configured, or the lookup failed. They are one
 * state on purpose: each of them means the same thing to the person looking at the form.</p>
 */
type UsernameExistenceState = 'unchecked' | 'checking' | 'available' | 'taken';

/**
 * State and behaviour behind the registration form.
 *
 * <p>The form mirrors the backend's own constraints so that an obvious mistake is caught before
 * a round trip; the backend stays the authority and its complaints are shown when it disagrees.</p>
 *
 * <p>A successful registration does not sign anyone in. The account is created in
 * {@code PENDING_ACTIVATION} and an activation link is mailed; only after that link is followed
 * can the account authenticate. The backend's own wording is shown as received, because it is
 * deliberately identical whether the account was created or the address was already taken —
 * replacing it would turn this form into a way of discovering who is registered.</p>
 *
 * <p>Which is why the acknowledgement alone used to be a dead end: told to check an inbox that
 * an undelivered mail never reached, there was nothing on the page to do next. So the same
 * resend the activation page offers is offered here too, and the backend's report of a mail it
 * could not hand to its relay is shown beside it — see {@link submitResendRequest} and
 * {@link emailDeliveryWarning}.</p>
 */
@Injectable()
export class RegisterPageViewModel extends AbstractFormViewModel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly usernameExistenceService = inject(UsernameExistenceService);

  /**
   * How long typing has to stop before the username is looked up.
   *
   * <p>250ms by default: long enough that a word typed at speed costs one request rather than
   * one per letter, short enough that the answer arrives while the field still has the user's
   * attention. Configurable because the backend refuses calls made closer together than its own
   * minimum interval, and the two have to be adjustable together — see
   * {@code usernameCheckDebounceMilliseconds}.</p>
   */
  private readonly usernameCheckDebounceMilliseconds =
    inject(RUNTIME_CONFIGURATION).usernameCheckDebounceMilliseconds;

  /** The registration form, with the backend's constraints restated as validators. */
  readonly registrationForm = this.formBuilder.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.usernameMinimumLength),
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.usernameMaximumLength),
        Validators.pattern(REGISTRATION_FIELD_CONSTRAINTS.usernamePattern),
      ],
    ],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.emailMaximumLength),
      ],
    ],
    displayName: [
      '',
      [
        Validators.required,
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.displayNameMaximumLength),
      ],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMinimumLength),
        Validators.maxLength(REGISTRATION_FIELD_CONSTRAINTS.passwordMaximumLength),
      ],
    ],
    passwordConfirmation: ['', [Validators.required, matchesTheChosenPassword]],
  });

  /**
   * Re-judges the repeat field whenever the password above it changes.
   *
   * <p>Angular validates a control when <em>that</em> control changes, so without this the two
   * fields would agree, then the user would correct the password above and the repeat field
   * would go on claiming they match. Editing either one has to re-ask the same question.</p>
   */
  private readonly recheckConfirmationWhenPasswordChanges =
    this.registrationForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() =>
        this.registrationForm.controls.passwordConfirmation.updateValueAndValidity(),
      );

  /** One finished validation message per field, empty where the field is fine or untouched. */
  readonly fieldValidationMessages = createFormValidationMessagesSignal(
    this.registrationForm,
    this.translationService,
  );

  /**
   * What the backend last said about the typed username.
   *
   * <p>Driven by the control's own value stream rather than by a signal effect, because the
   * whole point is the pause between keystrokes and debouncing is what a stream does well.</p>
   */
  private readonly usernameExistenceState = toSignal(
    this.registrationForm.controls.username.valueChanges.pipe(
      debounceTime(this.usernameCheckDebounceMilliseconds),
      map((typedUsername) => typedUsername.trim()),
      distinctUntilChanged(),
      switchMap((typedUsername) => this.lookUpUsername(typedUsername)),
    ),
    { initialValue: 'unchecked' as UsernameExistenceState },
  );

  /** Whether the backend is being asked about the typed username right now. */
  readonly isCheckingUsernameExistence = computed(
    () => this.usernameExistenceState() === 'checking',
  );

  /**
   * Finished text saying the typed username is already registered, empty when it is not.
   *
   * <p>Separate from {@link usernameAvailableMessage} rather than one message with a flag beside
   * it, so that the template picks between two blocks of markup and each gets its own class to
   * be styled against — a warning and a reassurance do not look alike.</p>
   */
  readonly usernameTakenMessage = computed(() =>
    this.usernameExistenceState() === 'taken'
      ? this.translationService.translate('register.usernameTaken')
      : '',
  );

  /** Finished text saying the typed username is still free, empty when it is not. */
  readonly usernameAvailableMessage = computed(() =>
    this.usernameExistenceState() === 'available'
      ? this.translationService.translate('register.usernameAvailable')
      : '',
  );

  /**
   * The address the last accepted registration named, empty until there has been one.
   *
   * <p>Kept because the form is cleared on success and the address is needed afterwards, to ask
   * for another activation link without making someone type it again. Holding it rather than
   * leaving the field filled also keeps the two concerns apart: the form is for the next
   * registration, this is a fact about the one that already happened.</p>
   */
  private readonly addressTheActivationLinkWasSentTo = signal('');

  /** Whether the backend reported that it could not hand the message to its mail relay. */
  private readonly wasTheMessageUndelivered = signal(false);

  /**
   * Whether to offer another activation link.
   *
   * <p>Offered from the moment a registration is accepted and not withdrawn afterwards: a
   * resend that itself goes astray is exactly when a second attempt is wanted.</p>
   */
  readonly isResendOffered = computed<boolean>(
    () => this.addressTheActivationLinkWasSentTo().length > 0,
  );

  /**
   * Finished text saying the message could not be sent, empty when there is nothing to report.
   *
   * <p>An addition to the backend's acknowledgement rather than a replacement for it. The
   * acknowledgement is uniform on purpose, and this warning is safe alongside it precisely
   * because it is uniform too — a message is mailed whether the account was created or the
   * address was already registered, so a delivery failure cannot tell the two apart.</p>
   */
  readonly emailDeliveryWarning = computed<string>(() =>
    this.wasTheMessageUndelivered()
      ? this.translationService.translate('register.emailNotDelivered')
      : '',
  );

  /**
   * Submits the form.
   *
   * <p>An invalid form is marked touched instead of sent, which is what makes the per-field
   * messages appear for someone who pressed the button without filling anything in.</p>
   *
   * <p>The submitted values are taken once, up front, because the form is cleared as soon as the
   * backend accepts them and the address is still needed after that.</p>
   */
  submitRegistration(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    const submittedRegistration = this.registrationForm.getRawValue();
    this.forgetThePreviousRegistration();
    this.beginSubmission();

    this.authenticationService.register(submittedRegistration).subscribe({
      next: (acknowledgement) => {
        this.addressTheActivationLinkWasSentTo.set(submittedRegistration.email);
        this.wasTheMessageUndelivered.set(acknowledgement.emailDelivered === false);
        this.completeSubmission(acknowledgement.message);
        this.registrationForm.reset();
      },
      error: (failure: unknown) => this.failSubmission(failure, REGISTRATION_FAILURE_WORDING),
    });
  }

  /**
   * Asks for another activation link for the address that was just registered.
   *
   * <p>Nothing is asked for again: the address was typed a moment ago, and re-typing it is the
   * kind of ceremony the activation page only puts up with because someone arriving there from
   * an email link has told this site nothing. The backend answers the same way whether or not
   * anything was sent, and its wording is shown as received for the same reason it is above.</p>
   *
   * <p>Any standing delivery warning is dropped as the attempt starts, for the reason
   * {@code beginSubmission} clears the rest of the feedback: what the previous attempt reported
   * is not what this one did.</p>
   */
  submitResendRequest(): void {
    const emailAddress = this.addressTheActivationLinkWasSentTo();
    if (emailAddress.length === 0) {
      return;
    }

    this.wasTheMessageUndelivered.set(false);
    this.beginSubmission();

    this.authenticationService.resendActivationLink(emailAddress).subscribe({
      next: (acknowledgement) => this.completeSubmission(acknowledgement.message),
      error: (failure: unknown) => this.failSubmission(failure),
    });
  }

  /**
   * Drops what the last accepted registration left behind.
   *
   * <p>Called as a new one starts, so that a failed second attempt cannot leave a resend button
   * pointing at the address from the first.</p>
   */
  private forgetThePreviousRegistration(): void {
    this.addressTheActivationLinkWasSentTo.set('');
    this.wasTheMessageUndelivered.set(false);
  }

  /**
   * Looks one username up, or decides there is nothing worth asking.
   *
   * <p>Emits {@code checking} before the request so the wait is visible, then the answer. A
   * failure — a rejected API key, an unreachable backend, a deployment with no key configured —
   * resolves to {@code unchecked} and is otherwise ignored: this check is a convenience, and it
   * must never be able to stop someone registering. The backend still refuses a duplicate
   * username at submission time, which is the answer that actually counts.</p>
   *
   * @param typedUsername the trimmed value currently in the field
   * @returns the states to report for this value, in order
   */
  private lookUpUsername(typedUsername: string): Observable<UsernameExistenceState> {
    if (
      typedUsername.length === 0 ||
      this.registrationForm.controls.username.invalid ||
      !this.usernameExistenceService.isUsernameExistenceCheckAvailable()
    ) {
      return of<UsernameExistenceState>('unchecked');
    }

    return concat(
      of<UsernameExistenceState>('checking'),
      this.usernameExistenceService.checkWhetherUsernameExists(typedUsername).pipe(
        map((exists): UsernameExistenceState => (exists ? 'taken' : 'available')),
        catchError(() => of<UsernameExistenceState>('unchecked')),
      ),
    );
  }

  /**
   * Hands the visitor to Google instead.
   *
   * <p>Google both creates and signs in — the backend finds the account or makes one — so the
   * same button serves registration and login, and there is nothing to fill in here first.</p>
   */
  registerWithGoogle(): void {
    this.authenticationService.startGoogleSignIn();
  }
}
