// One clock for the entire site.
//
// A previous build ran five independent requestAnimationFrame loops (Lenis,
// two shader fields, the WebGL stage, the cursor). They drifted relative to
// each other, which is exactly how a "continuous cinematic flow" turns into
// parts that visibly disagree. Everything registers here, and GSAP's ticker is
// the single driver — so the scene, the scroll and any DOM motion are all
// phase-locked by construction.
//
// The state below is pinned to a window-level symbol rather than held in
// module scope. Astro bundles each component <script> as its own entry, and
// under some chunking outcomes two entries end up with *separate instances* of
// this module — at which point the driver mutates one Set and every subscriber
// sits in another, and the whole site silently stops animating with no error.
// Pinning makes duplicate instances share one clock instead of forking it.

type Frame = (t: number, dt: number) => void;

interface View {
  progress: number;
  scrollY: number;
  vh: number;
  /** Smoothed signed scroll speed, px/s. */
  velocity: number;
  /** Signed and normalised to ±1. Drives anything directional. */
  flow: number;
  /** 0..1 asymmetric envelope: snaps up, glides down. Drives intensity. */
  energy: number;
}

interface Clock {
  frames: Set<Frame>;
  view: View;
  last: number;
  ticks: number;
  started: boolean;
}

const KEY = '__altug_clock__';

const clock: Clock =
  ((globalThis as any)[KEY] as Clock) ??
  ((globalThis as any)[KEY] = {
    frames: new Set<Frame>(),
    view: { progress: 0, scrollY: 0, vh: 0, velocity: 0, flow: 0, energy: 0 },
    last: 0,
    ticks: 0,
    started: false,
  });

export function onFrame(fn: Frame): () => void {
  clock.frames.add(fn);
  return () => clock.frames.delete(fn);
}

export function runFrame(t: number): void {
  const dt = clock.last ? Math.min(t - clock.last, 0.1) : 0.016;
  clock.last = t;
  clock.ticks++;
  for (const fn of clock.frames) fn(t, dt);
}

// Scroll progress 0..1 across the whole document, written once per frame and
// read by everyone. Nobody else may touch scrollY in a loop.
export const view = clock.view;

export const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));

// ---- scroll energy ---------------------------------------------------------
// Scroll speed that counts as "everything on". Roughly two viewport-heights a
// second on a 900px window — a hard flick, not a normal read.
const FULL_SCALE = 2600;

// The asymmetry IS the effect. Attack reaches ~90% in about 100ms so the shell
// tears the instant you move; release takes ~1.2s so it glides back to pristine
// rather than snapping off, which would read as a bug rather than a decay.
const ATTACK = 22;
const RELEASE = 2.2;

// Light smoothing on the raw derivative. Lenis already inertially smooths
// scrollY, but with prefers-reduced-motion Lenis is off and raw wheel steps are
// jagged — this keeps the signal identical in both modes.
const VELOCITY_SMOOTH = 18;

export function measureScroll(dt = 0.016): void {
  const d = Math.max(dt, 1e-4);
  const y = window.scrollY;
  const h = document.documentElement.scrollHeight - window.innerHeight;

  // First measurement has no previous sample. Browsers also restore scroll
  // position on reload, which would otherwise register as an enormous spike.
  if (!clock.started) {
    clock.started = true;
    view.scrollY = y;
  }

  const raw = (y - view.scrollY) / d;
  view.velocity = damp(view.velocity, raw, VELOCITY_SMOOTH, d);
  view.scrollY = y;
  view.vh = window.innerHeight;
  view.progress = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;

  view.flow = Math.max(-1, Math.min(1, view.velocity / FULL_SCALE));

  const target = Math.min(1, Math.abs(view.velocity) / FULL_SCALE);
  view.energy = damp(view.energy, target, target > view.energy ? ATTACK : RELEASE, d);
}

/** Frames driven since load. Zero after a second means nothing is driving the clock. */
export const ticks = (): number => clock.ticks;
