// LIGHT-SPEED WARP.
//
// A programmatic jump between points on the track that reads as travel rather
// than as a scrollbar being dragged. One shared 0..1 value, `warp`, is raised
// while the camera is in transit and consumed by every scene that can express
// speed: the starfield stretches its points into streaks, the beam's solitary
// pump accelerates toward a continuous strobe.
//
// Two decisions matter for smoothness.
//
// 1. The scroll itself is handed to Lenis rather than animated by hand. Lenis
//    already owns scrollY; a second animator writing window.scrollTo would
//    fight it for the same value every frame and stutter. Under
//    prefers-reduced-motion Lenis is not running at all, so that path falls
//    back to a native instant jump with no warp.
//
// 2. `warp` is driven off a clock, not off distance travelled. Tying it to
//    scroll velocity sounds more physical but couples the effect to Lenis's
//    easing curve, so a short hop barely warps and a long one pins at full
//    stretch for seconds. A fixed envelope makes every jump feel the same.

const KEY = '__altug_warp__';

interface WarpState {
  /** 0..1, read by the scenes every frame. */
  value: number;
  /** Wall-clock ms remaining in the current transit, 0 when idle. */
  until: number;
  total: number;
  active: boolean;
}

const state: WarpState =
  ((globalThis as any)[KEY] as WarpState) ??
  ((globalThis as any)[KEY] = { value: 0, until: 0, total: 0, active: false });

export const warp = state;

/** Attack/decay envelope: snaps into the stretch, eases out of it. */
function envelope(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  // Rises over the first fifth, holds, then releases across the last third —
  // the release is the long part because arriving is what the eye reads.
  const rise = Math.min(1, p / 0.18);
  const fall = 1 - Math.max(0, (p - 0.62) / 0.38);
  const e = Math.min(rise, Math.max(0, fall));
  return e * e * (3 - 2 * e);
}

/**
 * Advance the warp envelope. Called once per frame from the clock, never by a
 * scene — there is exactly one owner of this value.
 */
export function stepWarp(nowMs: number): void {
  if (!state.active) {
    state.value = 0;
    return;
  }
  const remaining = state.until - nowMs;
  if (remaining <= 0) {
    state.active = false;
    state.value = 0;
    return;
  }
  const p = 1 - remaining / state.total;
  state.value = envelope(p);
}

/**
 * Jump to an absolute document position, in viewport-heights, at warp.
 * Duration scales with distance so a short hop does not feel padded and a long
 * one does not feel rushed.
 */
export function warpTo(targetVh: number, opts: { immediate?: boolean } = {}): void {
  const vh = window.innerHeight || 1;
  const target = Math.max(0, targetVh * vh);
  const distanceVh = Math.abs(target - window.scrollY) / vh;

  const lenis = (window as any).__lenis;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (opts.immediate || reduced || !lenis) {
    // No Lenis (reduced motion) means no smoothing to ride, so there is nothing
    // for a warp to decorate. Jump plainly instead of faking it.
    window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' });
    return;
  }

  const duration = Math.min(2.6, Math.max(0.9, 0.42 * Math.sqrt(distanceVh) + 0.5));

  state.total = duration * 1000;
  state.until = performance.now() + state.total;
  state.active = true;

  lenis.scrollTo(target, {
    duration,
    // Sharp start, long settle — matches the envelope so the stretch peaks
    // while the page is genuinely moving fastest.
    easing: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  });
}
