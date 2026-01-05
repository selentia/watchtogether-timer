/**
 * @file src/types/messages.ts
 *
 * @description
 * Shared message contract (request/response) between:
 * - content scripts (per-frame)
 * - background service worker
 * - timer popup UI
 *
 * Why:
 * - Keep message shapes centralized so all modules share the same contract.
 * - Reduce stringly-typed drift across background/content/UI.
 */

import type { PlaybackSnapshot, PlaybackTime } from './playback';

// -----------------------------------------------------------------------------
// Background -> Content (per-frame)
// -----------------------------------------------------------------------------

export type GetTimeRequest = {
  type: 'GET_TIME';
};

export type GetTimeResponse = PlaybackSnapshot;

// -----------------------------------------------------------------------------
// Timer UI -> Background
// -----------------------------------------------------------------------------

export type PollRequest = {
  type: 'POLL';
};

export type PollResponse = {
  tabId: number | null;
  time: PlaybackTime | null;
  stale: boolean;
};

// Some call sites prefer allowing null for "unsupported message" fallbacks.
export type PollResponseOrNull = PollResponse | null;
