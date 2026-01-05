import { describe, expect, it, vi } from 'vitest';

function patchVideo(v: HTMLVideoElement, props: Partial<Record<keyof HTMLVideoElement, any>>) {
  for (const [k, val] of Object.entries(props)) {
    Object.defineProperty(v, k, { value: val, configurable: true });
  }
}

describe('content branches', () => {
  it('returns hasVideo:false when no <video> elements exist', async () => {
    vi.resetModules();
    document.body.innerHTML = ``;

    await import('../src/content');

    const chromeAny: any = globalThis.chrome;
    const listener = chromeAny.runtime.onMessage.__listeners[0];

    const res = await new Promise<any>((resolve) => listener({ type: 'GET_TIME' }, {}, resolve));
    expect(res.hasVideo).toBe(false);
  });

  it('selects the longest valid-duration video when nothing is playing (withDuration branch)', async () => {
    vi.resetModules();
    document.body.innerHTML = `<video id="a"></video><video id="b"></video>`;

    const a = document.getElementById('a') as HTMLVideoElement;
    const b = document.getElementById('b') as HTMLVideoElement;

    patchVideo(a, { paused: true, currentTime: 1, duration: 100, readyState: 2 });
    patchVideo(b, { paused: true, currentTime: 2, duration: 200, readyState: 2 });

    await import('../src/content');

    const chromeAny: any = globalThis.chrome;
    const listener = chromeAny.runtime.onMessage.__listeners[0];

    const res = await new Promise<any>((resolve) => listener({ type: 'GET_TIME' }, {}, resolve));
    expect(res.hasVideo).toBe(true);
    expect(res.duration).toBe(200);
  });

  it('falls back to the first <video> when nothing is usable (absolute fallback)', async () => {
    vi.resetModules();
    document.body.innerHTML = `<video id="a"></video><video id="b"></video>`;

    const a = document.getElementById('a') as HTMLVideoElement;
    const b = document.getElementById('b') as HTMLVideoElement;

    // Force both videos to be unusable: low readyState
    patchVideo(a, { paused: true, currentTime: 10, duration: 123, readyState: 0 });
    patchVideo(b, { paused: false, currentTime: 20, duration: 999, readyState: 0 });

    await import('../src/content');

    const chromeAny: any = globalThis.chrome;
    const listener = chromeAny.runtime.onMessage.__listeners[0];

    const res = await new Promise<any>((resolve) => listener({ type: 'GET_TIME' }, {}, resolve));

    // Absolute fallback returns videos[0] (= a)
    expect(res.hasVideo).toBe(true);
    expect(res.current).toBe(10);
    expect(res.duration).toBe(123);
  });
});
