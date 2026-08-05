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

interface Clock {
  frames: Set<Frame>;
  view: { progress: number; scrollY: number; vh: number };
  last: number;
  ticks: number;
}

const KEY = '__altug_clock__';

const clock: Clock =
  ((globalThis as any)[KEY] as Clock) ??
  ((globalThis as any)[KEY] = {
    frames: new Set<Frame>(),
    view: { progress: 0, scrollY: 0, vh: 0 },
    last: 0,
    ticks: 0,
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

export function measureScroll(): void {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  view.scrollY = window.scrollY;
  view.vh = window.innerHeight;
  view.progress = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
}

/** Frames driven since load. Zero after a second means nothing is driving the clock. */
export const ticks = (): number => clock.ticks;

export const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));
