/**
 * @file src/types/playback.ts
 *
 * @description
 * Shared playback timing contract between
 * content scripts, background worker, and UI.
 *
 * This module defines a stable, shared contract for representing
 * playback timing state for a single "best" media element.
 *
 * Notes:
 * - All time values are in **seconds** (same as HTMLMediaElement APIs).
 * - `duration` may be NaN/Infinity in some environments (e.g., live streams),
 *   so consumers should apply defensive checks when needed.
 */

export type PlaybackNone = {
  /**
   * Discriminant for "no usable media detected" in a frame/document.
   */
  hasVideo: false;
};

export type PlaybackTime = {
  /**
   * Discriminant for a confirmed, usable media source.
   */
  hasVideo: true;

  /**
   * Current playback position in seconds.
   * (HTMLMediaElement.currentTime)
   */
  current: number;

  /**
   * Total media duration in seconds.
   * (HTMLMediaElement.duration)
   */
  duration: number;

  /**
   * Whether playback is currently paused.
   * (HTMLMediaElement.paused)
   */
  paused: boolean;
};

/**
 * Snapshot returned from a frame/document:
 * either a usable timing state, or an explicit "no media" marker.
 */
export type PlaybackSnapshot = PlaybackNone | PlaybackTime;
