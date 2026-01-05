import { describe, expect, it, vi } from 'vitest';

describe('background POLL fallbacks', () => {
  it('falls back to lastTime.tabId when targetTabId is missing/invalid and returns stale cache', async () => {
    vi.resetModules();
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    // Pretend: targetTabId exists, but the tab was closed (tab lookup fails)
    chromeAny.tabs.get.mockRejectedValueOnce(new Error('no tab'));

    // Seed cache so POLL can fall back to it
    await chromeAny.storage.session.set({
      targetTabId: 1,
      lastTime: {
        tabId: 9,
        time: { hasVideo: true, current: 1, duration: 99, paused: true },
        updatedAt: Date.now(),
      },
    });

    // Force per-frame messaging to fail via runtime.lastError → treated as null results
    chromeAny.tabs.sendMessage.mockImplementation((tabId: number, msg: any, opts: any, cb: (res?: any) => void) => {
      chromeAny.runtime.lastError = { message: 'fail' };
      cb(undefined);
      chromeAny.runtime.lastError = null;
    });

    const pollListener = chromeAny.__mock.runtimeOnMessage.__listeners[0];
    const res = await new Promise<any>((resolve) => pollListener({ type: 'POLL' }, {}, resolve));

    expect(res.stale).toBe(true);
    expect(res.tabId).toBe(9);
    expect(res.time?.duration).toBe(99);
  });

  it('returns absolute fallback when both targetTabId and cache are missing', async () => {
    vi.resetModules();
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    await chromeAny.storage.session.set({ targetTabId: null, lastTime: null });

    const pollListener = chromeAny.__mock.runtimeOnMessage.__listeners[0];
    const res = await new Promise<any>((resolve) => pollListener({ type: 'POLL' }, {}, resolve));

    expect(res.stale).toBe(true);
    expect(res.tabId).toBe(null);
    expect(res.time).toBe(null);
  });
});
