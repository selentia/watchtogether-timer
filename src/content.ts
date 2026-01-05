/**
 * @file src/content.ts
 *
 * @description
 * Content script responsible for detecting media playback state
 * inside a single document or iframe.
 *
 * Responsibilities:
 * - Discover all <video> elements in the current DOM
 * - Track the most recently activated video element
 * - Apply heuristics to choose the most plausible "main" video
 * - Respond to background requests with playback timing info
 *
 * Design notes:
 * - Pages may contain multiple videos (ads, previews, hidden players).
 * - Media state is volatile; this script must be cheap and defensive.
 * - No polling here: detection is pull-based from the background worker.
 */

// -----------------------------------------------------------------------------
// Types & DOM extensions
// -----------------------------------------------------------------------------

import type { PlaybackSnapshot } from './types/playback';
import type { GetTimeResponse } from './types/messages';

/**
 * Extend HTMLVideoElement with a private marker
 * to avoid rebinding event listeners multiple times.
 */
interface WatchTimerVideo extends HTMLVideoElement {
  __watchTimerBound?: boolean;
}

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

/**
 * Cache of the most recently activated video element.
 *
 * Updated on:
 * - "play"
 * - "playing"
 *
 * Used as a strong hint for the user's actual focus.
 */
let lastActiveVideo: WatchTimerVideo | null = null;

// -----------------------------------------------------------------------------
// Event binding
// -----------------------------------------------------------------------------

/**
 * Bind playback-related events to a video element.
 *
 * This is idempotent:
 * - Each video element is bound only once
 * - Marker flag is stored directly on the element
 */
function bindVideoEvents(video: WatchTimerVideo): void {
  if (video.__watchTimerBound) return;
  video.__watchTimerBound = true;

  video.addEventListener('play', () => {
    lastActiveVideo = video;
  });

  video.addEventListener('playing', () => {
    lastActiveVideo = video;
  });
}

// -----------------------------------------------------------------------------
// Video selection heuristics
// -----------------------------------------------------------------------------

/**
 * Determine whether a video element is usable
 * for time synchronization.
 *
 * Purpose:
 * - Exclude ads, placeholders, or preloading-only videos
 */
function isUsable(video: HTMLVideoElement): boolean {
  return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !Number.isNaN(video.currentTime);
}

/**
 * Find the most plausible "main" video element
 * in the current document.
 *
 * Priority order:
 * 0) Last actively played video (if still in DOM)
 * 1) Currently playing videos, preferring longer duration
 * 2) Videos with valid duration, preferring longer
 * 3) Any usable video
 * 4) Absolute fallback: first <video> element
 */
function findBestVideo(): WatchTimerVideo | null {
  const videos = Array.from(document.querySelectorAll('video')) as WatchTimerVideo[];

  if (videos.length === 0) return null;

  // Ensure event listeners are attached
  videos.forEach(bindVideoEvents);

  // 0) Strongest signal: recently activated video
  if (lastActiveVideo && document.contains(lastActiveVideo)) {
    return lastActiveVideo;
  }

  // 1) Prefer actively playing videos
  const playing = videos.filter((v) => !v.paused && isUsable(v) && Number.isFinite(v.duration) && v.duration > 0);

  if (playing.length) {
    playing.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return playing[0];
  }

  // 2) Fallback: longest valid duration
  const withDuration = videos.filter((v) => isUsable(v) && Number.isFinite(v.duration) && v.duration > 0);

  if (withDuration.length) {
    withDuration.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    return withDuration[0];
  }

  // 3) Any usable video
  const usableAny = videos.find(isUsable);
  if (usableAny) return usableAny;

  // 4) Absolute fallback
  return videos[0];
}

// -----------------------------------------------------------------------------
// Data extraction
// -----------------------------------------------------------------------------

/**
 * Extract playback timing information
 * from the selected video element.
 */
function getTime(): PlaybackSnapshot {
  const video = findBestVideo();
  if (!video) {
    return { hasVideo: false };
  }

  return {
    hasVideo: true,
    current: video.currentTime,
    duration: video.duration,
    paused: video.paused,
  };
}

// -----------------------------------------------------------------------------
// Message handling
// -----------------------------------------------------------------------------

/**
 * Respond to background worker requests.
 *
 * Contract:
 * - Stateless per call
 * - No side effects beyond updating lastActiveVideo
 */
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'GET_TIME') {
    sendResponse(getTime() as GetTimeResponse);
  }
});
