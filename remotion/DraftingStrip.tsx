import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * A drafting sheet that keeps being drawn.
 *
 * This is the one thing Remotion is genuinely the right tool for on this site:
 * a deterministic timeline rendered ahead of time. Everything else here is
 * scroll- and pointer-driven and has to run live, which is the opposite of what
 * a frame-indexed renderer can express.
 *
 * SEAMLESS LOOPING is the whole constraint. The strip sits on the page on
 * `loop`, so frame `durationInFrames` must be indistinguishable from frame 0:
 *
 *   - the grid translates exactly one tile across the full duration, so it
 *     lands on a position identical to where it started
 *   - every annotation's opacity begins and ends at 0
 *
 * Colours are the site's own tokens, hard-coded because this renders outside
 * the browser and cannot read a stylesheet. They must be kept in step with
 * global.css by hand — there is no import that would catch a drift.
 */

// Re-toned for the dark ground. On paper these were ink on white; here the
// sheet is the void and the drawing is drawn in light, which is the same
// inversion the CSS elevation scale goes through. A strip left on its original
// light palette would tear a bright rectangle out of the middle of the page.
const GROUND = '#0d0d10';
const INK_4 = '#3d3d46';
const INK_2 = '#c3c1ba';
const OXIDE = '#e08a55';

/** Grid tile, px. The translation per loop is exactly this. */
const TILE = 40;

export const DraftingStrip: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // 0..1 across the loop, never reaching 1 — at exactly 1 the grid would have
  // travelled a full tile and the annotations would be back at zero, which is
  // frame 0's state. Playing both would show one duplicated frame per cycle.
  const t = frame / durationInFrames;

  // One tile of travel per loop. Slow: this is a background texture, not an
  // event, and anything faster reads as the page sliding.
  const shift = t * TILE;

  /**
   * Fade an annotation in and out inside its own slice of the loop, easing at
   * both ends so nothing pops. Returns 0 outside the slice, which is what
   * guarantees the first and last frames are clean.
   */
  const pulse = (start: number, end: number) => {
    const fade = (end - start) * 0.28;
    return interpolate(
      t,
      [start, start + fade, end - fade, end],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
  };

  /** Draw a stroked path on, using dash offset. */
  const draw = (len: number, start: number, end: number) =>
    interpolate(t, [start, end], [len, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  const midY = height / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: GROUND }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <pattern
            id="grid"
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
            /* The pattern itself is translated rather than the rect, so the
               tiling stays locked to the pattern origin and no seam appears at
               the edges of the surface. */
            patternTransform={`translate(${-shift} 0)`}
          >
            <path
              d={`M ${TILE} 0 L 0 0 0 ${TILE}`}
              fill="none"
              stroke={INK_4}
              strokeWidth="1"
              opacity="0.28"
            />
          </pattern>

          <marker
            id="tick"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <path d="M3 2 L7 8" stroke={OXIDE} strokeWidth="1.4" fill="none" />
          </marker>
        </defs>

        <rect width={width} height={height} fill="url(#grid)" />

        {/* Centre line — the datum every drawing is built from. Long dashes so
            it reads as a construction line rather than a border. */}
        <line
          x1="0"
          y1={midY}
          x2={width}
          y2={midY}
          stroke={INK_4}
          strokeWidth="1"
          strokeDasharray="18 6 3 6"
          strokeDashoffset={-shift}
          opacity="0.55"
        />

        {/* A profile that draws itself across the first half of the loop, then
            releases. 1180 is a deliberate over-estimate of the path length —
            it only has to exceed it for the dash to hide the whole stroke. */}
        <g opacity={pulse(0.02, 0.62)}>
          <path
            d={`M 120 ${midY + 70}
                L 120 ${midY - 30}
                Q 120 ${midY - 70} 160 ${midY - 70}
                L 300 ${midY - 70}
                Q 340 ${midY - 70} 340 ${midY - 30}
                L 340 ${midY + 70}`}
            fill="none"
            stroke={INK_2}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="1180"
            strokeDashoffset={draw(1180, 0.04, 0.4)}
          />
          {/* Centre mark on the arc's origin. */}
          <g stroke={OXIDE} strokeWidth="1.2" opacity="0.9">
            <line x1="222" y1={midY - 82} x2="238" y2={midY - 82} />
            <line x1="230" y1={midY - 90} x2="230" y2={midY - 74} />
          </g>
        </g>

        {/* Dimension line with witness lines, offset below the profile. */}
        <g opacity={pulse(0.18, 0.72)}>
          <line x1="120" y1={midY + 82} x2="120" y2={midY + 108} stroke={OXIDE} strokeWidth="1" />
          <line x1="340" y1={midY + 82} x2="340" y2={midY + 108} stroke={OXIDE} strokeWidth="1" />
          <line
            x1="120"
            y1={midY + 100}
            x2="340"
            y2={midY + 100}
            stroke={OXIDE}
            strokeWidth="1.2"
            markerStart="url(#tick)"
            markerEnd="url(#tick)"
          />
          <text
            x="230"
            y={midY + 92}
            fill={OXIDE}
            fontFamily="monospace"
            fontSize="15"
            letterSpacing="2"
            textAnchor="middle"
          >
            220.0
          </text>
        </g>

        {/* A second study further along the sheet, offset in time so the strip
            never has everything on it at once. */}
        <g opacity={pulse(0.42, 0.98)}>
          <circle
            cx={width - 300}
            cy={midY}
            r="62"
            fill="none"
            stroke={INK_2}
            strokeWidth="2"
            strokeDasharray="390"
            strokeDashoffset={draw(390, 0.44, 0.76)}
          />
          <circle
            cx={width - 300}
            cy={midY}
            r="26"
            fill="none"
            stroke={INK_4}
            strokeWidth="1.4"
            strokeDasharray="4 4"
          />
          <g stroke={OXIDE} strokeWidth="1.2">
            <line x1={width - 300 - 78} y1={midY} x2={width - 300 + 78} y2={midY} />
            <line x1={width - 300} y1={midY - 78} x2={width - 300} y2={midY + 78} />
          </g>
          <text
            x={width - 300 + 86}
            y={midY - 70}
            fill={INK_2}
            fontFamily="monospace"
            fontSize="15"
            letterSpacing="2"
          >
            R62
          </text>
        </g>

        {/* Sheet annotation, bottom-left, in the drawing-office register. */}
        <text
          x="40"
          y={height - 26}
          fill={INK_4}
          fontFamily="monospace"
          fontSize="13"
          letterSpacing="4"
          opacity="0.85"
        >
          PROCESS — SECTION STUDY — SCALE 1:2
        </text>
      </svg>
    </AbsoluteFill>
  );
};
