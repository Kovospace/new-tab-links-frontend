import { DestroyRef, Signal, inject, signal } from '@angular/core';

/**
 * A sentence that shows for a while and then takes itself away.
 *
 * <p>Some messages describe a moment rather than a state: a device was signed out, a code was
 * copied. Left on screen they go stale, and a confirmation still sitting above a table the reader
 * has since changed says something that is no longer true — worse, it reads as though it refers to
 * whatever they did last. So the moment expires, and the page returns to describing only itself.</p>
 *
 * <p>Failures are deliberately not this. Something that went wrong is still wrong after ten
 * seconds, and wording that removes itself takes the explanation with it.</p>
 *
 * <p>Not an {@code @Injectable}: a view-model may hold several of these, so they are values it
 * creates rather than dependencies it asks for. {@link createSelfClearingMessage} is how one is
 * made, and is what ties it to the lifetime of whatever created it.</p>
 */
export class SelfClearingMessage {
  private readonly text = signal('');
  private clearTimer: ReturnType<typeof setTimeout> | null = null;

  /** The sentence to show, empty when there is nothing to say. */
  readonly value: Signal<string> = this.text.asReadonly();

  /**
   * @param lifetimeMilliseconds how long a message stays on screen before removing itself
   */
  constructor(private readonly lifetimeMilliseconds: number) {}

  /**
   * Shows one sentence, and arranges for it to go away again.
   *
   * <p>Any message already showing is replaced and its timer restarted, so two announcements in
   * quick succession do not leave the second one disappearing on the first one's schedule.</p>
   *
   * @param message the sentence to show; an empty one simply clears what is there
   */
  show(message: string): void {
    this.clear();

    if (!message) {
      return;
    }

    this.text.set(message);
    this.clearTimer = setTimeout(() => {
      this.clearTimer = null;
      this.text.set('');
    }, this.lifetimeMilliseconds);
  }

  /**
   * Takes the message away now, cancelling the timer that would have done it later.
   *
   * <p>Cancelling matters as much as clearing: a timer left running would set the signal after
   * whatever owns it has gone.</p>
   */
  clear(): void {
    if (this.clearTimer !== null) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    this.text.set('');
  }
}

/**
 * Creates a message that clears itself, tied to the lifetime of the caller.
 *
 * <p>Must be called from an injection context — a view-model's field initialiser is one — because
 * it takes a {@link DestroyRef} to cancel any pending timer when the page is left. Constructing
 * {@link SelfClearingMessage} directly is possible but leaves that to the caller.</p>
 *
 * @param lifetimeMilliseconds how long a message stays on screen before removing itself
 * @returns the message
 */
export function createSelfClearingMessage(lifetimeMilliseconds: number): SelfClearingMessage {
  const message = new SelfClearingMessage(lifetimeMilliseconds);
  inject(DestroyRef).onDestroy(() => message.clear());

  return message;
}
