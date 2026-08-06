// THE DESCENT MAP.
//
// Scroll position -> depth down the beam, with the project stops built into
// the mapping itself rather than bolted onto the camera as special cases.
//
// The pause at a stop is not the camera "stopping". Scroll keeps flowing —
// what changes is that the scroll no longer buys depth for the length of the
// hold window. That distinction matters: momentum, the energy envelope and any
// scroll-driven DOM keep running normally through a stop, so the page never
// feels like it seized. Only the descent plateaus.
//
// Everything here is authored in viewport-heights, because that is the unit the
// track is designed in ("AEQUA around 200vh"). Nothing downstream needs to know
// the total track length.

export interface Stop {
  id: string;
  /** Centre of the stop, in viewport-heights down the track. */
  at: number;
  /** Total width of the frozen-depth window, in viewport-heights. */
  hold: number;
  /** Lead-in/out over which the stop's influence ramps 0..1, in vh. */
  ramp: number;
}

export const STOPS: Stop[] = [
  { id: 'aequa', at: 5.0, hold: 1.0, ramp: 0.7 },
  { id: 'shifu', at: 7.4, hold: 1.0, ramp: 0.7 },
];

/**
 * THE WHITE-OUT DIVE.
 *
 * A threshold before the first stop: the camera leaves its parallel descent,
 * closes onto the beam axis, passes through the core — where the frame blows
 * to white — and pulls back out into the AEQUA stop.
 *
 * `peak` is where the camera is dead centre. `hold` is a plateau of full
 * intensity centred on the peak — dive stays pinned at 1 across it, so the
 * pure-white frame lasts long enough to carry the "Welcome." card rather than
 * being an instant the eye barely registers.
 *
 * Pushed deep (2.6-4.1vh) to leave the whole first stretch of the track to the
 * hero and the About section, which the visitor reads before the camera
 * commits to the threshold.
 */
export const DIVE = { start: 2.6, peak: 3.3, hold: 0.55, end: 4.1 };

/** Total document track. Scrollable range is this minus one viewport. */
export const TRACK_VH = 10;

/** World units of descent bought per viewport-height of effective scroll. */
export const RATE = 62;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const smoothstep = (a: number, b: number, x: number) => {
  if (a === b) return x < a ? 0 : 1;
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Depth in world units at scroll position `s` (viewport-heights).
 * Monotonic and non-decreasing: flat across each hold window, linear elsewhere.
 */
export function descent(s: number): number {
  let effective = 0;
  let cursor = 0;

  for (const stop of STOPS) {
    const a = stop.at - stop.hold / 2;
    const b = stop.at + stop.hold / 2;

    if (s <= a) return (effective + (s - cursor)) * RATE;

    effective += a - cursor;
    cursor = b;

    // Inside the window: depth is frozen at whatever it was on entry.
    if (s < b) return effective * RATE;
  }

  return (effective + (s - cursor)) * RATE;
}

/** Total depth across the whole track, for sizing the beam and placing stops. */
export const TOTAL_DEPTH = descent(TRACK_VH - 1);

/**
 * How present a stop is at scroll position `s`: 1 across its hold window,
 * falling to 0 across the ramp on either side.
 */
export function focusAt(s: number, stop: Stop): number {
  const d = Math.abs(s - stop.at);
  const inner = stop.hold / 2;
  return 1 - smoothstep(inner, inner + stop.ramp, d);
}

/** World Y at the centre of a stop's frame. */
export function stopDepth(stop: Stop): number {
  return descent(stop.at);
}

/**
 * Dive intensity 0..1 at scroll position `s`. 0 outside the window, 1 exactly
 * at the peak. Drives the Z plunge, the gaze rotation, the beam boost and the
 * bloom blow-out together, so all four can never disagree about where the
 * threshold is.
 */
export function diveAt(s: number): number {
  if (s <= DIVE.start || s >= DIVE.end) return 0;
  const half = DIVE.hold / 2;
  // Flat top across the hold window: this is what makes the white-out last.
  if (s >= DIVE.peak - half && s <= DIVE.peak + half) return 1;
  return s < DIVE.peak
    ? smoothstep(DIVE.start, DIVE.peak - half, s)
    : 1 - smoothstep(DIVE.peak + half, DIVE.end, s);
}
