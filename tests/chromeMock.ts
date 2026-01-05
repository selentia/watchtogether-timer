import { vi } from 'vitest';

type Listener = (...args: any[]) => any;

function createEvent() {
  const listeners: Listener[] = [];
  return {
    addListener: (fn: Listener) => listeners.push(fn),
    // Expose listeners for direct invocation in tests
    __listeners: listeners,
  };
}

export function createChromeMock() {
  // In-memory session storage (chrome.storage.session)
  const sessionStore = new Map<string, any>();

  const runtimeOnMessage = createEvent();
  const actionOnClicked = createEvent();
  const windowsOnRemoved = createEvent();

  const chromeMock: any = {
    runtime: {
      lastError: null,
      onMessage: runtimeOnMessage,
      // Used by timer.ts (callback-style API)
      sendMessage: vi.fn((msg: any, cb?: (res: any) => void) => {
        const listener = runtimeOnMessage.__listeners[0];
        if (!listener) return cb?.(null);

        let done = false;
        const sendResponse = (res: any) => {
          done = true;
          cb?.(res);
        };

        const ret = listener(msg, {}, sendResponse);
        // If the listener does not return true and never called sendResponse,
        // treat it as "no response".
        // (background.ts returns true to keep the message channel open.)
        if (ret !== true && !done) cb?.(null);
      }),
    },

    action: {
      onClicked: actionOnClicked,
    },

    windows: {
      onRemoved: windowsOnRemoved,
      create: vi.fn(async () => ({ id: 123 })),
      update: vi.fn(async () => ({})),
    },

    tabs: {
      get: vi.fn(async (tabId: number) => ({ id: tabId })),
      // Used by background.ts (callback-style API)
      sendMessage: vi.fn((tabId: number, msg: any, opts: any, cb: (res?: any) => void) => {
        cb(null);
      }),
    },

    webNavigation: {
      getAllFrames: vi.fn(async () => [{ frameId: 0 }, { frameId: 1 }]),
    },

    scripting: {
      executeScript: vi.fn(async () => []),
    },

    storage: {
      session: {
        get: vi.fn(async (keys: string[]) => {
          const out: Record<string, any> = {};
          for (const k of keys) out[k] = sessionStore.get(k);
          return out;
        }),
        set: vi.fn(async (items: Record<string, any>) => {
          for (const [k, v] of Object.entries(items)) sessionStore.set(k, v);
        }),
      },
    },
  };

  // Test-only access to internal state / listeners
  chromeMock.__mock = {
    sessionStore,
    runtimeOnMessage,
    actionOnClicked,
    windowsOnRemoved,
  };

  return chromeMock;
}
