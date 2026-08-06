// THE BLUEPRINT — the right-hand counterweight to the About copy.
//
// The hero and About sit on the left; the right of the beam was dead space.
// This fills it with a slow-turning cluster of technical wireframes: an
// aerodynamic profile swept into a lattice, a pair of instrument rings, and a
// scatter of survey points. It reads as a designer's blueprint volume floating
// in the void rather than as decoration.
//
// Everything is line geometry, deliberately. Lines carry the drafting language
// the copy is talking about, they cost almost nothing, and — crucially — they
// stay far below the bloom threshold, so this layer cannot compete with the
// beam it is standing next to.
//
// It exists ONLY across the reading section and is gone before the dive: it
// belongs to the part of the journey where there is text to balance.

import { DIVE } from '../lib/stops';

/** World X of the cluster centre, mirroring the copy on the left. */
const OFFSET_X = 7.4;
/** Fades out well before the dive begins so it never survives into the warp. */
const FADE_END = DIVE.start - 0.35;

const VERT = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  attribute float aDepth;
  varying float vFade;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Nearer strands read stronger, so the cluster has depth rather than
    // flattening into a single traced outline.
    vFade = uReveal * (0.35 + aDepth * 0.65);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    gl_FragColor = vec4(uColor * vFade * uOpacity, 1.0);
  }
`;

export interface BlueprintHandle {
  group: any;
  dispose: () => void;
}

export function initBlueprint(api: any): BlueprintHandle {
  const { THREE, scene } = api;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const group = new THREE.Group();
  group.position.set(OFFSET_X, 0, -2.5);
  scene.add(group);

  const uniforms = {
    uReveal: { value: 0 },
    uColor: { value: new THREE.Color(0x8fd8ff) },
    uOpacity: { value: 0.5 },
  };

  const lineMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const geos: any[] = [];

  const addLines = (points: number[], depths: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
    g.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(depths), 1));
    const l = new THREE.LineSegments(g, lineMat);
    l.frustumCulled = false;
    l.renderOrder = -5;
    group.add(l);
    geos.push(g);
    return l;
  };

  // ---- aerofoil lattice ------------------------------------------------------
  // A NACA-ish section swept along Z and cross-braced: the sort of thing that
  // sits on a composites engineer's screen.
  const foil = (t: number) => {
    // Half-thickness distribution of a symmetric 4-digit section.
    const x = t;
    const y =
      0.6 *
      (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1015 * x ** 4);
    return y;
  };

  const RIBS = 7;
  const SEGS = 26;
  const CHORD = 3.2;
  const SPAN = 4.4;
  {
    const pts: number[] = [];
    const dep: number[] = [];
    const push = (a: number[], b: number[], d: number) => {
      pts.push(a[0], a[1], a[2], b[0], b[1], b[2]);
      dep.push(d, d);
    };
    const ribPoint = (i: number, s: number, sign: number) => {
      const t = i / SEGS;
      return [(t - 0.5) * CHORD, foil(t) * sign * CHORD, (s / (RIBS - 1) - 0.5) * SPAN];
    };
    for (let r = 0; r < RIBS; r++) {
      const d = 1 - Math.abs(r / (RIBS - 1) - 0.5) * 1.4;
      for (let i = 0; i < SEGS; i++) {
        for (const sign of [1, -1]) {
          push(ribPoint(i, r, sign), ribPoint(i + 1, r, sign), d);
        }
      }
      // Stringers between ribs.
      if (r < RIBS - 1) {
        for (let i = 0; i <= SEGS; i += 6) {
          for (const sign of [1, -1]) {
            push(ribPoint(i, r, sign), ribPoint(i, r + 1, sign), d * 0.7);
          }
        }
      }
    }
    addLines(pts, dep);
  }

  // ---- instrument rings ------------------------------------------------------
  // Two tilted circles with tick marks — the HUD crosshair language, kept
  // off-axis so they read as instruments rather than as a target.
  const rings = new THREE.Group();
  group.add(rings);
  {
    const mkRing = (radius: number, ticks: number, tickLen: number) => {
      const pts: number[] = [];
      const dep: number[] = [];
      const N = 96;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * Math.PI * 2;
        const a1 = ((i + 1) / N) * Math.PI * 2;
        pts.push(Math.cos(a0) * radius, Math.sin(a0) * radius, 0);
        pts.push(Math.cos(a1) * radius, Math.sin(a1) * radius, 0);
        dep.push(0.8, 0.8);
      }
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        pts.push(c * radius, s * radius, 0);
        pts.push(c * (radius + tickLen), s * (radius + tickLen), 0);
        dep.push(1, 1);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
      g.setAttribute('aDepth', new THREE.BufferAttribute(new Float32Array(dep), 1));
      const l = new THREE.LineSegments(g, lineMat);
      l.frustumCulled = false;
      l.renderOrder = -5;
      geos.push(g);
      return l;
    };
    const r1 = mkRing(3.4, 24, 0.22);
    r1.rotation.set(0.9, 0.3, 0);
    const r2 = mkRing(2.5, 12, 0.34);
    r2.rotation.set(-0.5, 0.8, 0.4);
    rings.add(r1, r2);
  }

  // ---- survey points ---------------------------------------------------------
  // Small crosses scattered through the volume: measurement marks, not stars.
  {
    const pts: number[] = [];
    const dep: number[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = (Math.random() - 0.5) * 7;
      const z = (Math.random() - 0.5) * 5;
      const s = 0.11;
      const d = 0.5 + Math.random() * 0.5;
      pts.push(x - s, y, z, x + s, y, z);
      pts.push(x, y - s, z, x, y + s, z);
      dep.push(d, d, d, d);
    }
    addLines(pts, dep);
  }

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const stop = api.onTick((t: number, dt: number) => {
    const svh = api.view.scrollY / Math.max(1, api.view.vh);

    // Present across the hero and the reading, gone before the threshold.
    const target = 1 - smoothstep(FADE_END - 0.8, FADE_END, svh);
    uniforms.uReveal.value = damp(uniforms.uReveal.value, target, 4, dt);
    group.visible = uniforms.uReveal.value > 0.003;

    if (!reduced) {
      group.rotation.y = t * 0.07;
      group.rotation.x = Math.sin(t * 0.11) * 0.13;
      rings.rotation.z = -t * 0.05;
    }

    // Rides down with the camera so it stays beside the copy rather than
    // sliding off the top as the descent starts.
    group.position.y = api.camera.position.y + 0.6;
  });

  return {
    group,
    dispose: () => {
      stop();
      group.removeFromParent();
      for (const g of geos) g.dispose();
      lineMat.dispose();
    },
  };
}
