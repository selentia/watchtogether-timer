import { describe, expect, it } from 'vitest';

describe('background POLL', () => {
  it('prefers playing media and falls back to cached time as stale on detection failure', async () => {
    // Import background.ts to register listeners
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    // Simulate the real flow: user clicks the extension action → targetTabId is set
    const onClicked = chromeAny.__mock.actionOnClicked.__listeners[0];
    await onClicked({ id: 1 });

    // Two frames: one playing (shorter), one paused (longer)
    chromeAny.tabs.sendMessage.mockImplementation((tabId: number, msg: any, opts: any, cb: (res: any) => void) => {
      const frameId = opts?.frameId;
      if (frameId === 0) {
        cb({ hasVideo: true, current: 10, duration: 100, paused: false });
        return;
      }
      cb({ hasVideo: true, current: 5, duration: 200, paused: true });
    });

    // First POLL: playing frame should be preferred → stale=false
    const pollListener = chromeAny.__mock.runtimeOnMessage.__listeners[0];
    const res1 = await new Promise<any>((resolve) => {
      pollListener({ type: 'POLL' }, {}, resolve);
    });

    expect(res1.stale).toBe(false);
    expect(res1.time?.duration).toBe(100);

    // Second POLL: force per-frame messaging to fail via runtime.lastError
    chromeAny.tabs.sendMessage.mockImplementation((tabId: number, msg: any, opts: any, cb: (res: any) => void) => {
      chromeAny.runtime.lastError = { message: 'fail' };
      cb(undefined);
      chromeAny.runtime.lastError = null;
    });

    const res2 = await new Promise<any>((resolve) => {
      pollListener({ type: 'POLL' }, {}, resolve);
    });

    expect(res2.stale).toBe(true);
    // Cache should keep the last known good time
    expect(res2.time?.duration).toBe(100);
  });
});
