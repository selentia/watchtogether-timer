import { describe, expect, it, vi } from 'vitest';

describe('timer extra branches', () => {
  it('renders H:MM:SS formatting and the paused state label', async () => {
    vi.useFakeTimers();
    vi.resetModules();

    document.body.innerHTML = `<div id="time"></div><div id="state"></div>`;

    const chromeAny: any = globalThis.chrome;
    chromeAny.runtime.sendMessage.mockImplementation((msg: any, cb: any) => {
      cb({
        tabId: 1,
        time: { hasVideo: true, current: 3661, duration: 7322, paused: true }, // 1:01:01 / 2:02:02
        stale: false,
      });
    });

    await import('../src/timer');
    await vi.runOnlyPendingTimersAsync();

    expect(document.getElementById('time')?.textContent).toContain('1:01:01');
    expect(document.getElementById('time')?.textContent).toContain('2:02:02');
    expect(document.getElementById('state')?.textContent).toBe('일시정지됨');

    vi.useRealTimers();
  });

  it("shows '확인 중' when stale=true", async () => {
    vi.useFakeTimers();
    vi.resetModules();

    document.body.innerHTML = `<div id="time"></div><div id="state"></div>`;

    const chromeAny: any = globalThis.chrome;
    chromeAny.runtime.sendMessage.mockImplementation((msg: any, cb: any) => {
      cb({
        tabId: 1,
        time: { hasVideo: true, current: 65, duration: 125, paused: false },
        stale: true,
      });
    });

    await import('../src/timer');
    await vi.runOnlyPendingTimersAsync();

    expect(document.getElementById('state')?.textContent).toBe('확인 중');

    vi.useRealTimers();
  });
});
