import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
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
  });

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
   * Submits the form.
   *
   * <p>An invalid form is marked touched instead of sent, which is what makes the per-field
   * messages appear for someone who pressed the button without filling anything in.</p>
   */
  submitRegistration(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.beginSubmission();

    this.authenticationService.register(this.registrationForm.getRawValue()).subscribe({
      next: (acknowledgement) => {
        this.completeSubmission(acknowledgement.message);
        this.registrationForm.reset();
      },
      error: (failure: unknown) => this.failSubmission(failure, REGISTRATION_FAILURE_WORDING),
    });
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
