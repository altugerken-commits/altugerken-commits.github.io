// One clock for the entire site.
//
// A previous build ran five independent requestAnimationFrame loops (Lenis,
// two shader fields, the WebGL stage, the cursor). They drifted relative to
// each other, which is exactly how a "continuous cinematic flow" turns into
// parts that visibly disagree. Everything now registers here, and GSAP's
// ticker is the single driver — so the type, the background thread, the model
// and the cursor are all phase-locked by construction.

type Frame = (t: number, dt: number) => void;

const frames = new Set<Frame>();
let last = 0;

export function onFrame(fn: Frame): () => void {
  frames.add(fn);
  return () => frames.delete(fn);
}

export function runFrame(t: number): void {
  const dt = last ? Math.min(t - last, 0.1) : 0.016;
  last = t;
  for (const fn of frames) fn(t, dt);
}

// Scroll progress 0..1 across the whole document, written once per frame and
// read by everyone. Nobody else may touch scrollY in a loop.
export const view = { progress: 0, scrollY: 0, vh: 0 };

export function measureScroll(): void {
  const h = document.documentElement.scrollHeight - window.innerHeight;
  view.scrollY = window.scrollY;
  view.vh = window.innerHeight;
  view.progress = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
}

export const damp = (a: number, b: number, lambda: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-lambda * dt));
