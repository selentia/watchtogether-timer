/**
 * @file src/background.ts
 *
 * @description
 * Background service worker for "같이보기 타이머".
 *
 * Responsibilities:
 * - Manage the lifecycle of the timer popup window
 * - Inject content scripts into all frames of the active tab
 * - Collect media playback state from every frame
 * - Select the most plausible "main" media source
 * - Serve stable time data to the timer window via polling
 *
 * Design notes:
 * - Media detection is inherently unreliable (iframes, ads, players).
 * - Therefore, this module prefers "last known good state" over null results.
 * - Timer UI must never flicker between valid time ↔ no media.
 */

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const TIMER_WINDOW_URL = 'timer.html';

const STATE_KEYS = {
  /** chrome.windows.Window.id of the timer popup */
  windowId: 'timerWindowId',

  /**
   * Target tab id to sync against.
   *
   * Why:
   * - Timer popup is a separate window (type: "popup")
   * - If we query active tab in currentWindow, we may get timer.html itself
   */
  targetTabId: 'targetTabId',

  /**
   * Last successfully detected playback state.
   * Used as a fallback when media detection temporarily fails.
   */
  lastTime: 'lastTime',
} as const;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

import type { PlaybackTime } from './types/playback';
import type { GetTimeRequest, GetTimeResponse, PollResponseOrNull } from './types/messages';

type CachedTime = {
  tabId: number;
  time: PlaybackTime;
  updatedAt: number;
};

type StoredState = {
  windowId: number | null;
  targetTabId: number | null;
  lastTime: CachedTime | null;
};

// -----------------------------------------------------------------------------
// State helpers (session-scoped, service-worker safe)
// -----------------------------------------------------------------------------

async function getState(): Promise<StoredState> {
  const res = await chrome.storage.session.get(Object.values(STATE_KEYS));
  return {
    windowId: (res[STATE_KEYS.windowId] as number | undefined) ?? null,
    targetTabId: (res[STATE_KEYS.targetTabId] as number | undefined) ?? null,
    lastTime: (res[STATE_KEYS.lastTime] as CachedTime | undefined) ?? null,
  };
}

async function setState(patch: Partial<StoredState>): Promise<StoredState> {
  const cur = await getState();
  const next: StoredState = { ...cur, ...patch };

  await chrome.storage.session.set({
    [STATE_KEYS.windowId]: next.windowId,
    [STATE_KEYS.targetTabId]: next.targetTabId,
    [STATE_KEYS.lastTime]: next.lastTime,
  });

  return next;
}

// -----------------------------------------------------------------------------
// Window / tab utilities
// -----------------------------------------------------------------------------

async function tabExists(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId);
    return true;
  } catch {
    return false;
  }
}

async function focusTimerWindow(windowId: number): Promise<boolean> {
  try {
    await chrome.windows.update(windowId, { focused: true });
    return true;
  } catch {
    // Window may have been closed manually
    return false;
  }
}

async function openTimerWindow(): Promise<number | null> {
  const created = await chrome.windows.create({
    url: TIMER_WINDOW_URL,
    type: 'popup',
    width: 260,
    height: 170,
  });

  return created?.id ?? null;
}

// -----------------------------------------------------------------------------
// Frame & content-script handling
// -----------------------------------------------------------------------------

/**
 * Retrieve all frames of a tab.
 * Requires `webNavigation` permission.
 */
async function getAllFrames(tabId: number): Promise<chrome.webNavigation.GetAllFrameResultDetails[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    return frames ?? [];
  } catch {
    return [];
  }
}

/**
 * Force-inject content scripts into all existing frames.
 *
 * Why:
 * - content_scripts only auto-inject on navigation
 * - already-open pages and iframes would otherwise be missed
 */
async function ensureContentScript(tabId: number | null): Promise<void> {
  if (!tabId) return;

  const frames = await getAllFrames(tabId);

  await Promise.all(
    frames.map((frame) =>
      chrome.scripting
        .executeScript({
          target: { tabId, frameIds: [frame.frameId] },
          files: ['content.js'],
        })
        .catch(() => {
          // Ignore:
          // - already injected frames
          // - restricted frames
        })
    )
  );
}

// -----------------------------------------------------------------------------
// Media playback candidate selection
// -----------------------------------------------------------------------------

type Candidate = PlaybackTime & {
  playing: boolean;
};

/**
 * Choose the most plausible "main" media source.
 *
 * Heuristics:
 * 1) Prefer currently playing media
 * 2) Among them, prefer longer duration (exclude ads, shorts)
 * 3) Fallback to longest duration overall
 */
function pickBest(candidates: Candidate[]): Candidate | null {
  if (!candidates.length) return null;

  const playing = candidates.filter((c) => c.playing);
  if (playing.length) {
    playing.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return playing[0];
  }

  candidates.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  return candidates[0];
}

/**
 * Query every frame in a tab and return the best playback state.
 */
async function getBestTimeFromTab(tabId: number | null): Promise<Candidate | null> {
  if (!tabId) return null;

  const frames = await getAllFrames(tabId);
  const frameIds = frames.map((f) => f.frameId);

  const req: GetTimeRequest = { type: 'GET_TIME' };

  const results = await Promise.all(
    frameIds.map(
      (frameId) =>
        new Promise<GetTimeResponse | null>((resolve) => {
          chrome.tabs.sendMessage(tabId, req, { frameId }, (res) => {
            // Avoid console spam from expected failures
            if (chrome.runtime.lastError) {
              resolve(null);
              return;
            }
            resolve((res as GetTimeResponse) ?? null);
          });
        })
    )
  );

  const candidates: Candidate[] = results
    .filter((r): r is PlaybackTime => Boolean(r && r.hasVideo))
    .map((r) => ({
      ...r,
      playing: !r.paused && Number.isFinite(r.current) && Number.isFinite(r.duration) && r.duration > 0,
    }));

  return pickBest(candidates);
}

// -----------------------------------------------------------------------------
// User interaction: extension action
// -----------------------------------------------------------------------------

chrome.action.onClicked.addListener(async (tab) => {
  const state = await getState();
  const clickedTabId = tab?.id ?? null;

  // 1) Re-focus existing timer window if possible
  if (state.windowId) {
    const ok = await focusTimerWindow(state.windowId);
    if (ok) {
      // Re-target to the tab the user clicked from (instant usability)
      await ensureContentScript(clickedTabId);
      await setState({ targetTabId: clickedTabId });
      return;
    }

    // Stale window reference
    await setState({ windowId: null });
  }

  // 2) Create a new timer window
  const windowId = await openTimerWindow();

  // 3) Immediately inject content script for instant detection
  await ensureContentScript(clickedTabId);

  await setState({ windowId, targetTabId: clickedTabId });
});

// Clean up state when the timer window is closed
chrome.windows.onRemoved.addListener(async (removedId) => {
  const state = await getState();
  if (state.windowId === removedId) {
    await setState({ windowId: null });
  }
});

// -----------------------------------------------------------------------------
// Message handling (timer window polling)
// -----------------------------------------------------------------------------

/**
 * Timer window polls once per second.
 *
 * Contract:
 * - Never return "no media" unless absolutely necessary
 * - Prefer cached values when detection fails
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    const state = await getState();

    if (msg?.type !== 'POLL') {
      sendResponse(null as PollResponseOrNull);
      return;
    }

    // Resolve target tab:
    // - Prefer saved targetTabId (popup focus must not affect this)
    // - If tab no longer exists, fallback to cached tabId
    let targetTabId: number | null = state.targetTabId;

    if (targetTabId && !(await tabExists(targetTabId))) {
      targetTabId = null;
    }

    if (!targetTabId) {
      targetTabId = state.lastTime?.tabId ?? null;
    }

    // No target tab → fallback to cache
    if (!targetTabId) {
      sendResponse({
        tabId: state.lastTime?.tabId ?? null,
        time: state.lastTime?.time ?? null,
        stale: true,
      });
      return;
    }

    // Ensure injection even for already-open tabs
    await ensureContentScript(targetTabId);

    const best = await getBestTimeFromTab(targetTabId);

    if (best) {
      // Do not persist "playing" helper flag into storage
      const { playing: _playing, ...time } = best;

      const nextCache: CachedTime = {
        tabId: targetTabId,
        time,
        updatedAt: Date.now(),
      };

      await setState({ targetTabId, lastTime: nextCache });

      sendResponse({
        tabId: targetTabId,
        time,
        stale: false,
      });
      return;
    }

    // Detection failed → serve cached value
    if (state.lastTime?.time) {
      sendResponse({
        tabId: state.lastTime.tabId,
        time: state.lastTime.time,
        stale: true,
      });
      return;
    }

    // Absolute fallback
    sendResponse({
      tabId: targetTabId,
      time: null,
      stale: true,
    });
  })();

  return true; // keep message channel open
});
