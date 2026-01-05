import { describe, expect, it } from 'vitest';

function patchVideo(v: HTMLVideoElement, props: Partial<Record<keyof HTMLVideoElement, any>>) {
  for (const [k, val] of Object.entries(props)) {
    Object.defineProperty(v, k, { value: val, configurable: true });
  }
}

describe('content GET_TIME', () => {
  it('prefers a playing video, then switches to lastActiveVideo after a play event', async () => {
    document.body.innerHTML = `<video id="a"></video><video id="b"></video>`;
    const a = document.getElementById('a') as HTMLVideoElement;
    const b = document.getElementById('b') as HTMLVideoElement;

    // jsdom videos lack real media state, so patch required fields
    patchVideo(a, { paused: true, currentTime: 1, duration: 300, readyState: 2 });
    patchVideo(b, { paused: false, currentTime: 10, duration: 60, readyState: 2 });

    await import('../src/content');

    const chromeAny: any = globalThis.chrome;
    const listener = chromeAny.runtime.onMessage.__listeners[0];

    // 1) Default: prefer the currently playing video (b)
    const res1 = await new Promise<any>((resolve) => listener({ type: 'GET_TIME' }, {}, resolve));
    expect(res1.hasVideo).toBe(true);
    expect(res1.duration).toBe(60);

    // 2) After a play event on (a), lastActiveVideo should take priority
    a.dispatchEvent(new Event('play'));

    const res2 = await new Promise<any>((resolve) => listener({ type: 'GET_TIME' }, {}, resolve));
    expect(res2.duration).toBe(300);
  });
});
