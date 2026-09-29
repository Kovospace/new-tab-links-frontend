import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApiClient } from '@app/core/api/backend-api.client';
import {
  REQUIRED_VISIBLE_MILLISECONDS,
  WEBSITE_VISIT_REPORTED_ON_STORAGE_KEY,
  WebsiteVisitReporter,
} from '@app/core/statistics/website-visit-reporter.service';

/**
 * A visit is reported once, and only when the visitor behaves like a person: visible for three
 * seconds and some interaction. Robots, hidden tabs and the operator's pages are never counted,
 * and a browser that already reported today (by UTC) stays quiet until the next UTC day.
 */
describe('WebsiteVisitReporter', () => {
  let visibilityState: DocumentVisibilityState;
  let fetchSpy: ReturnType<typeof vi.fn>;

  function becomeVisibility(nextState: DocumentVisibilityState): void {
    visibilityState = nextState;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  function startReporter(): void {
    TestBed.inject(WebsiteVisitReporter).watchForHumanVisit();
  }

  function behaveLikeAPerson(): void {
    startReporter();
    globalThis.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS);
  }

  function storedReportedDay(): string | null {
    return localStorage.getItem(WEBSITE_VISIT_REPORTED_ON_STORAGE_KEY);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T12:00:00.000Z'));
    localStorage.clear();
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
    fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchSpy);
    history.replaceState({}, '', '/');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: BackendApiClient,
          useValue: { buildAbsoluteUrl: (path: string) => `https://api.example${path}` },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    vi.useRealTimers();
    Reflect.deleteProperty(document, 'visibilityState');
    Reflect.deleteProperty(navigator, 'webdriver');
  });

  it('reports once after three visible seconds and an interaction, and never again', () => {
    startReporter();
    globalThis.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS - 1);
    expect(fetchSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example/api/v1/stats/website-visit', {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      mode: 'no-cors',
    });

    globalThis.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS * 10);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not report a visitor who never interacts', () => {
    startReporter();
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS * 10);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('counts only visible time: a hidden tab does not add up to three seconds', () => {
    startReporter();
    globalThis.dispatchEvent(new Event('keydown'));
    vi.advanceTimersByTime(2_000);
    becomeVisibility('hidden');
    vi.advanceTimersByTime(60_000);
    expect(fetchSpy).not.toHaveBeenCalled();

    becomeVisibility('visible');
    vi.advanceTimersByTime(999);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('never counts a browser that declares itself automated', () => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => true });
    startReporter();
    globalThis.dispatchEvent(new Event('touchstart'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS * 10);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never counts the operator's pages", () => {
    history.replaceState({}, '', '/admin/metrics');
    startReporter();
    globalThis.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storedReportedDay()).toBeNull();
  });

  it("remembers only today's UTC date once the visit is sent", () => {
    behaveLikeAPerson();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(storedReportedDay()).toBe('2026-09-29');
    expect(Object.keys(localStorage)).toEqual([WEBSITE_VISIT_REPORTED_ON_STORAGE_KEY]);
  });

  it('does not report again on a day this browser already reported', () => {
    localStorage.setItem(WEBSITE_VISIT_REPORTED_ON_STORAGE_KEY, '2026-09-29');
    behaveLikeAPerson();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storedReportedDay()).toBe('2026-09-29');
  });

  it('reports again once the UTC day has moved on, whatever the local clock says', () => {
    vi.setSystemTime(new Date('2026-09-30T00:30:00.000Z'));
    localStorage.setItem(WEBSITE_VISIT_REPORTED_ON_STORAGE_KEY, '2026-09-29');
    behaveLikeAPerson();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(storedReportedDay()).toBe('2026-09-30');
  });

  it('still reports when storage cannot be read or written, just without remembering', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    behaveLikeAPerson();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledTimes(1);
  });

  it('ignores a failed report', async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new TypeError('offline')));
    startReporter();
    globalThis.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(REQUIRED_VISIBLE_MILLISECONDS);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
  });
});
