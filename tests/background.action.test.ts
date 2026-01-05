import { describe, expect, it, vi } from 'vitest';

describe('background action / window lifecycle', () => {
  it('focuses existing timer window and retargets without creating a new window', async () => {
    vi.resetModules();
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    // Pretend: a timer popup window is already open and tracked in session storage
    await chromeAny.storage.session.set({ timerWindowId: 777 });

    const onClicked = chromeAny.__mock.actionOnClicked.__listeners[0];
    await onClicked({ id: 1 });

    expect(chromeAny.windows.update).toHaveBeenCalledWith(777, { focused: true });
    expect(chromeAny.windows.create).not.toHaveBeenCalled();

    // Ensure content scripts are injected for instant detection
    // (default chromeMock returns 2 frames → executeScript called at least once)
    expect(chromeAny.scripting.executeScript).toHaveBeenCalled();

    expect(chromeAny.__mock.sessionStore.get('targetTabId')).toBe(1);
    expect(chromeAny.__mock.sessionStore.get('timerWindowId')).toBe(777);
  });

  it('creates a new timer window when focusing the stored windowId fails', async () => {
    vi.resetModules();
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    // Pretend: windowId exists in storage but the window was closed manually
    await chromeAny.storage.session.set({ timerWindowId: 888 });

    chromeAny.windows.update.mockRejectedValueOnce(new Error('closed'));

    const onClicked = chromeAny.__mock.actionOnClicked.__listeners[0];
    await onClicked({ id: 1 });

    expect(chromeAny.windows.create).toHaveBeenCalled();
    expect(chromeAny.__mock.sessionStore.get('timerWindowId')).toBe(123); // chromeMock create() default id
    expect(chromeAny.__mock.sessionStore.get('targetTabId')).toBe(1);
  });

  it('clears windowId when the timer window is removed', async () => {
    vi.resetModules();
    await import('../src/background');

    const chromeAny: any = globalThis.chrome;

    // Pretend: the timer window is currently tracked
    await chromeAny.storage.session.set({ timerWindowId: 555 });

    const onRemoved = chromeAny.__mock.windowsOnRemoved.__listeners[0];
    await onRemoved(555);

    expect(chromeAny.__mock.sessionStore.get('timerWindowId')).toBe(null);
  });
});
