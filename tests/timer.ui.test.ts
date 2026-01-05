import { describe, expect, it, vi } from 'vitest';

describe('timer UI', () => {
  it('renders an initial UI and reflects the first poll result', async () => {
    vi.useFakeTimers();

    document.body.innerHTML = `
      <div id="time"></div>
      <div id="state"></div>
    `;

    const chromeAny: any = globalThis.chrome;

    // timer.ts uses chrome.runtime.sendMessage for polling
    chromeAny.runtime.sendMessage.mockImplementation((msg: any, cb: any) => {
      cb({
        tabId: 1,
        time: { hasVideo: true, current: 65, duration: 125, paused: false },
        stale: false,
      });
    });

    // Import triggers startup flow: render(null), setInterval, initial update()
    await import('../src/timer');

    // Allow the scheduled update() to run and reflect into the DOM
    await vi.runOnlyPendingTimersAsync();

    expect(document.getElementById('time')?.textContent).toContain('1:05');
    expect(document.getElementById('state')?.textContent).toBe('재생 중');

    vi.useRealTimers();
  });
});
