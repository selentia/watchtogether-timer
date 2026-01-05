/**
 * @file src/timer.ts
 *
 * @description
 * Timer popup UI controller.
 *
 * Responsibilities:
 * - Periodically poll the background service worker
 * - Render playback time in a human-readable format
 * - Display playback state while avoiding UI flicker
 *
 * Design notes:
 * - The background worker may restart at any time (MV3 constraint)
 * - Temporary failures must NOT be treated as "no media"
 * - Cached (stale) values are intentionally displayed
 */

// -----------------------------------------------------------------------------
// Types (UI ↔ background contract)
// -----------------------------------------------------------------------------

import type { PlaybackTime } from './types/playback';
import type { PollRequest, PollResponseOrNull } from './types/messages';

// -----------------------------------------------------------------------------
// Formatting utilities
// -----------------------------------------------------------------------------

/**
 * Format seconds into a human-readable timestamp.
 *
 * Rules:
 * - Invalid values → "--:--"
 * - < 1 hour     → M:SS
 * - ≥ 1 hour     → H:MM:SS
 */
function format(sec: number): string {
  if (!Number.isFinite(sec)) return '--:--';

  const total = Math.floor(sec);

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

/**
 * Render playback state into the popup UI.
 *
 * Rendering policy:
 * - `time === null` is only allowed on absolute first load
 * - Cached values are shown with "확인 중"
 * - UI never explicitly shows "미디어 없음"
 */
function render(time: PlaybackTime | null, stale: boolean): void {
  const timeEl = document.getElementById('time');
  const stateEl = document.getElementById('state');

  if (!timeEl || !stateEl) return;

  // Initial state: no cache, no detection yet
  if (!time) {
    timeEl.textContent = '--:-- / --:--';
    stateEl.textContent = '대기 중';
    stateEl.dataset.state = 'idle';
    return;
  }

  timeEl.textContent = `${format(time.current)} / ${format(time.duration)}`;

  if (stale) {
    stateEl.textContent = '확인 중';
    stateEl.dataset.state = 'stale';
    return;
  }

  stateEl.textContent = time.paused ? '일시정지됨' : '재생 중';
  stateEl.dataset.state = time.paused ? 'paused' : 'playing';
}

// -----------------------------------------------------------------------------
// Polling
// -----------------------------------------------------------------------------

/**
 * Request the current playback state from the background worker.
 *
 * Notes:
 * - Errors are expected during service worker restarts
 * - In such cases, UI intentionally remains unchanged
 */
function update(): void {
  const req: PollRequest = { type: 'POLL' };

  chrome.runtime.sendMessage(req, (res: PollResponseOrNull) => {
    if (chrome.runtime.lastError) {
      // Service worker may have restarted.
      // Keep current UI state untouched.
      return;
    }

    const time = res?.time ?? null;
    const stale = Boolean(res?.stale);

    render(time, stale);
  });
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

// Ensure non-empty initial UI even if the first poll fails
render(null, false);

// Poll every second
setInterval(update, 1000);

// Initial immediate poll
update();
