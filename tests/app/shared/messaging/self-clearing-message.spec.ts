import { SelfClearingMessage } from '@app/shared/messaging/self-clearing-message';

/** How long the messages under test are given, in milliseconds. */
const LIFETIME_MILLISECONDS = 10_000;

describe('SelfClearingMessage', () => {
  let message: SelfClearingMessage;

  beforeEach(() => {
    vi.useFakeTimers();
    message = new SelfClearingMessage(LIFETIME_MILLISECONDS);
  });

  afterEach(() => vi.useRealTimers());

  it('has nothing to say until something is shown', () => {
    expect(message.value()).toBe('');
  });

  it('shows the message for its whole lifetime', () => {
    message.show('That device was signed out.');

    vi.advanceTimersByTime(LIFETIME_MILLISECONDS - 1);

    expect(message.value()).toBe('That device was signed out.');
  });

  it('takes the message away once the lifetime is up', () => {
    message.show('That device was signed out.');

    vi.advanceTimersByTime(LIFETIME_MILLISECONDS);

    expect(message.value()).toBe('');
  });

  it('gives a replacement its own full lifetime rather than the remainder of the first', () => {
    message.show('That device was signed out.');
    vi.advanceTimersByTime(LIFETIME_MILLISECONDS - 1);
    message.show('That device was removed from the list.');

    vi.advanceTimersByTime(LIFETIME_MILLISECONDS - 1);
    expect(message.value()).toBe('That device was removed from the list.');

    vi.advanceTimersByTime(1);
    expect(message.value()).toBe('');
  });

  it('clears on demand, and the pending timer does not resurrect anything', () => {
    message.show('That device was signed out.');
    message.clear();

    expect(message.value()).toBe('');

    message.show('That device was removed from the list.');
    vi.advanceTimersByTime(LIFETIME_MILLISECONDS - 1);

    expect(message.value()).toBe('That device was removed from the list.');
  });

  it('treats an empty message as nothing to show', () => {
    message.show('That device was signed out.');
    message.show('');

    expect(message.value()).toBe('');
  });
});
