// DETAIL MODE + THE PORTAL.
//
// One shared state object describing whether the site is in free-roam
// inspection, and how far through the portal transition it is. Everything else
// reads it: the beam yields camera control, the stops pin themselves open, the
// starfield streaks, the DOM locks scrolling.
//
// The portal is a single 0..1 `progress` ramp, not a sequence of separate
// animations. Enter runs it 0 -> 1, exit runs it 1 -> 0, and every visual that
// participates is a pure function of that one number. That is what makes the
// exit "the exact reverse" rather than a second animation that has to be kept
// in agreement with the first.
//
// Scroll position is never moved. Locking Lenis freezes the page exactly where
// it stood, so "return to the previous position" needs no bookkeeping — there
// is nothing to restore because nothing was lost. The saved value below exists
// only as a guard against a stray programmatic scroll while locked.

const KEY = '__altug_detail__';

export type DetailMode = 'idle' | 'entering' | 'active' | 'exiting';

export interface DetailState {
  mode: DetailMode;
  /** 0 = normal site, 1 = fully inside detail mode. */
  progress: number;
  /** Which stop is being inspected, null when idle. */
  stopId: string | null;
  /** Scroll position at the moment of entry, in px. */
  savedScroll: number;
  /** Wall-clock ms the current transition ends. */
  until: number;
  total: number;
}

const state: DetailState =
  ((globalThis as any)[KEY] as DetailState) ??
  ((globalThis as any)[KEY] = {
    mode: 'idle',
    progress: 0,
    stopId: null,
    savedScroll: 0,
    until: 0,
    total: 0,
  });

export const detail = state;

/** Duration of one leg of the portal, seconds. */
const ENTER_S = 1.15;
const EXIT_S = 0.9;

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

let onChange: ((s: DetailState) => void) | null = null;

/** DOM side subscribes so it can flip the overlay exactly at the peak. */
export function onDetailChange(fn: (s: DetailState) => void): void {
  onChange = fn;
}

function setMode(next: DetailMode) {
  if (state.mode === next) return;
  state.mode = next;
  onChange?.(state);
}

export function enterDetail(stopId: string): void {
  if (state.mode === 'entering' || state.mode === 'active') return;
  state.stopId = stopId;
  state.savedScroll = window.scrollY;
  state.total = ENTER_S * 1000;
  state.until = performance.now() + state.total;
  setMode('entering');

  // Freeze the page. Lenis owns scrollY, so stopping it is the whole lock —
  // no wheel handlers, no overflow:hidden reflow, no scrollbar jump.
  const lenis = (window as any).__lenis;
  if (lenis) lenis.stop();
  document.documentElement.classList.add('is-detail');
}

export function exitDetail(): void {
  if (state.mode === 'idle' || state.mode === 'exiting') return;
  state.total = EXIT_S * 1000;
  state.until = performance.now() + state.total;
  setMode('exiting');
}

/**
 * Advance the portal. Driven once per frame from the clock, before any scene
 * reads `progress`, so every consumer sees the same value within a frame.
 */
export function stepDetail(nowMs: number): void {
  if (state.mode === 'idle') {
    state.progress = 0;
    return;
  }
  if (state.mode === 'active') {
    state.progress = 1;
    return;
  }

  const remaining = state.until - nowMs;
  const p = state.total > 0 ? 1 - remaining / state.total : 1;

  if (state.mode === 'entering') {
    state.progress = ease(Math.max(0, Math.min(1, p)));
    if (remaining <= 0) {
      state.progress = 1;
      setMode('active');
    }
    return;
  }

  // exiting
  state.progress = 1 - ease(Math.max(0, Math.min(1, p)));
  if (remaining <= 0) {
    state.progress = 0;
    state.stopId = null;
    setMode('idle');

    const lenis = (window as any).__lenis;
    if (lenis) {
      // Restore the exact position first, then hand control back. Starting
      // Lenis before correcting would let it animate from a stale internal
      // target and slide the page a few pixels on release.
      window.scrollTo(0, state.savedScroll);
      lenis.start();
    }
    document.documentElement.classList.remove('is-detail');
  }
}

/**
 * Tunnel-vision curve: 0 at both ends, 1 in the middle of the transition.
 * The FOV widens into the portal and settles back for inspection, so the warp
 * belongs to the travel and never to the resting state.
 */
export function portalPeak(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return Math.sin(p * Math.PI);
}
