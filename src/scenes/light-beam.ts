// VOLUMETRIC LIGHT BEAM — the hero.
//
// A razor core inside a wide bloom halo, struck down the world Y axis at the
// exact centre of frame, in a pure black void.
//
// Why billboarded planes and not a cylinder: a cylinder is the obvious way to
// build a beam and it fails at exactly the moment this scene needs it most.
// The camera plunges *down* the beam, so it passes close to the axis — and a
// cylinder shows its own silhouette and its own end caps the moment you get
// near it. Two yaw-billboarded planes have no silhouette from any angle. The
// beam stays a beam whether you are 12 units away or 0.4.
//
// Colour lives in the shader, not in a texture, so the cyan→white→violet ramp
// is a world-space function of Y — it stays locked to the world as the camera
// travels rather than sliding with the geometry.
//
// Everything additive, nothing writes depth. There is no lighting rig on
// purpose: nothing here is lit, it *is* the light.

import type { Vector2 } from 'three';
import { STOPS, descent, focusAt, diveAt, DIVE } from '../lib/stops';
import { warp } from '../lib/warp';
import { detail, portalPeak } from '../lib/detail';

interface StageApi {
  THREE: typeof import('three');
  scene: any;
  camera: any;
  renderer: any;
  pointer: Vector2;
  view: { progress: number; energy: number; flow: number; scrollY: number; vh: number };
  onTick: (fn: (t: number, dt: number) => void) => () => void;
  setRenderOverride: (fn: (t: number, dt: number) => void) => () => void;
}

// ---- tuning ----------------------------------------------------------------

/** Beam runs far past both ends of camera travel so it never terminates on screen. */
const BEAM_LENGTH = 1600;
/** Plane width for the core pass. The visible core is a tiny fraction of this. */
const CORE_WIDTH = 3.0;
/** The outer haze that bleeds into the void. */
const HAZE_WIDTH = 16.0;

/** Resting distance from the axis. */
const CAM_Z = 12;
/** How far below itself the camera aims at rest. */
const LOOK_AHEAD = 7;

// ---- white-out dive --------------------------------------------------------
/** Closest approach to the axis. Must stay > 0: see the camZ clamp. */
const DIVE_Z = 0.3;
/** Beam multiplier at the peak. Tuned against a full-framebuffer read. */
const DIVE_BOOST = 120;
/** Added tone-mapping exposure at the peak. */
const DIVE_EXPOSURE = 7;

const BLOOM_STRENGTH = 0.85;
const BLOOM_RADIUS = 0.28;
const BLOOM_THRESHOLD = 0.8;
const DIVE_BLOOM_STRENGTH = 3.2;
const DIVE_BLOOM_RADIUS = 0.9;
/** Peak additive light emitted by the flash quad. */
const FLASH_LEVEL = 16;

// ---- solitary pump ---------------------------------------------------------
/** Exactly one crest every 3.0s at rest. Collapses under warp. */
const PUMP_PERIOD = 3.0;
const PUMP_SPAN = 150;
const PUMP_GAIN = 2.6;

// ---- portal ----------------------------------------------------------------
/** Matches the PerspectiveCamera constructed in Scene.astro. */
const BASE_FOV = 50;
/**
 * Added at the midpoint of the transition — the tunnel-vision kick.
 * 50 + 92 puts the peak at 142°, which is past the point where straight lines
 * visibly bow. That distortion IS the effect: at 42 it read as a fast zoom.
 */
const PORTAL_FOV_KICK = 92;
/** Bloom piled on at the peak, on top of whatever the dive is already doing. */
const PORTAL_BLOOM_STRENGTH = 2.4;
const PORTAL_BLOOM_RADIUS = 0.55;
/** Resting FOV inside detail mode: slightly tighter, for product inspection. */
const DETAIL_FOV = 38;

const DUST_COUNT = 2600;
/** Dust wraps within this Y window around the camera, so it is always present. */
const DUST_RANGE = 140;
const DUST_RADIUS = 26;

const CYAN = 0x00e5ff;
const VIOLET = 0x7a1fff;

// ---- shaders ---------------------------------------------------------------

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const BEAM_FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uEnergy;
  uniform float uIntensity;
  uniform float uCoreExp;
  uniform float uMidExp;
  uniform float uHaloExp;
  uniform float uCoreGain;
  uniform float uMidGain;
  uniform float uHaloGain;
  uniform float uFlickerAmt;
  uniform float uRampFreq;
  uniform float uRampDrift;
  uniform float uWhiteMix;
  uniform float uSat;
  uniform float uSplinter;
  uniform float uSpread;
  uniform float uBoost;
  uniform float uPumpPeriod;
  uniform float uPumpSpan;
  uniform float uPumpWidth;
  uniform float uPumpGain;
  uniform float uCamY;
  uniform float uFade;
  uniform vec3  uColorA;
  uniform vec3  uColorB;

  varying vec2 vUv;
  varying float vWorldY;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float vnoise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), f);
  }

  // Three nested falloffs for one strand. The razor centre is the high
  // exponent; the wide low-exponent term is what bloom grabs and smears.
  float strand(float d) {
    float inv = 1.0 - clamp(d, 0.0, 1.0);
    return pow(inv, uCoreExp) * uCoreGain
         + pow(inv, uMidExp)  * uMidGain
         + pow(inv, uHaloExp) * uHaloGain;
  }

  void main() {
    // Signed offset from the axis, widened at a stop.
    float x = (vUv.x - 0.5) / max(0.35, 1.0 + uSpread);

    // Splintering. Two side strands peel away from the axis by a noise that
    // travels along the beam, so the column frays into filaments instead of
    // just getting fatter. Computed unconditionally — at uSplinter 0 the
    // offsets are 0, all three strands coincide, and the result is identical
    // to the single-strand beam. Branching here would only cost divergence.
    float o1 = (vnoise(vWorldY * 0.55 + uTime * 0.9) - 0.5) * uSplinter;
    float o2 = (vnoise(vWorldY * 0.83 - uTime * 1.3 + 17.0) - 0.5) * uSplinter;

    float e = strand(abs(x) * 2.0);
    e = max(e, strand(abs(x + o1) * 2.0) * 0.72);
    e = max(e, strand(abs(x - o2) * 2.0) * 0.72);

    // Kept for the colour/white terms below, which key off the razor centre.
    float core = pow(1.0 - clamp(abs(x) * 2.0, 0.0, 1.0), uCoreExp) * uCoreGain;

    // Travelling energy along the beam. Two octaves at different speeds so it
    // reads as charge moving through the column, not as a texture sliding.
    //
    // BOTH octaves must travel the same way as the pump. They used to run in
    // opposite directions (-uTime on one, +uTime on the other), which read as
    // undirected churn — fine when the beam was ambient, actively harmful now
    // the beam is meant to point downward. Measured: the upward octave carries
    // enough weight to capture the brightest row and drag the apparent flow
    // against the pump.
    float n =
      vnoise(vWorldY * 0.30 + uTime * 1.7) * 0.55 +
      vnoise(vWorldY * 1.55 + uTime * 3.3) * 0.28 +
      0.60;
    n = mix(1.0, n, uFlickerAmt);

    // ---- solitary pump ------------------------------------------------------
    // ONE crest, born at the top of the visible column, travelling its whole
    // length and gone at the bottom — then nothing until the cycle repeats.
    //
    // This replaces a continuous sinusoid, which put a crest on screen at all
    // times and therefore read as texture rather than as a signal. A single
    // travelling wave is legible as an instruction: go that way.
    //
    // The sweep is anchored to the CAMERA, not to world origin. The camera
    // descends 260 units across the track, so a world-anchored wave would
    // drift out of frame and the pump would vanish for most of the journey.
    float ph = fract(uTime / uPumpPeriod);
    float waveY = uCamY + uPumpSpan * 0.5 - ph * uPumpSpan;

    // Gaussian crest. Falls to nothing well inside the span so the wave truly
    // disappears at the bottom rather than wrapping visibly to the top.
    float d = (vWorldY - waveY) / uPumpWidth;
    float pulse = exp(-d * d);

    // Additive: the beam keeps its resting brightness and the crest rides over
    // it. Modulating downward instead would read as a dark band travelling.
    float pumpMul = 1.0 + uPumpGain * pulse;

    // World-space colour ramp, cyan <-> violet.
    //
    // This was originally a linear ramp over vWorldY * 0.010, which needs ±50
    // world units to traverse — but the camera only sees ~11 units of beam at
    // rest, so every visible pixel sat at g≈0.5 and the beam rendered as one
    // flat colour. Measured off-axis: identical RGB at top and bottom of frame.
    // Periodic instead — see uRampFreq for the swept wavelength. It puts a
    // visible gradient across the frame AND cycles the beam through several
    // colour zones during the descent, which is where the "multi-coloured"
    // reading actually comes from.
    float g = 0.5 + 0.5 * sin(vWorldY * uRampFreq + uRampDrift);
    vec3 col = mix(uColorA, uColorB, g);

    // Push chroma before the white core is mixed in. Bloom smears the core
    // outward and desaturates whatever it lands on, so the halo has to start
    // over-saturated to survive the post chain.
    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(vec3(l), col, uSat);

    // White-hot centre only. Mixing harder than this bleaches the bloom, and a
    // bleached bloom is what turns a cyan/violet beam into a grey searchlight.
    col = mix(col, vec3(1.0), clamp(core * uWhiteMix, 0.0, 1.0));

    float a = e * n * pumpMul * uIntensity * (0.72 + uEnergy * 0.75) * uBoost * uFade;

    // Feather both ends so the column never shows a hard terminator.
    a *= smoothstep(0.0, 0.05, vUv.y) * smoothstep(1.0, 0.95, vUv.y);

    // Additive: srcAlpha is 1 and the colour carries the intensity, so values
    // above 1.0 survive into the bloom pass instead of clipping here.
    gl_FragColor = vec4(col * a, 1.0);
  }
`;

const DUST_VERT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uCamY;
  uniform float uRange;
  uniform float uSize;
  uniform float uPixelRatio;

  attribute float aSeed;

  varying float vGlow;

  void main() {
    // Wrap each mote into a window centred on the camera so the volume is
    // always populated no matter how far the camera has descended.
    float drift = uTime * (0.6 + aSeed * 1.4);
    float y = mod(position.y + drift - uCamY + uRange * 0.5, uRange) - uRange * 0.5 + uCamY;

    float sway = sin(uTime * 0.4 + aSeed * 30.0) * 0.5;
    vec3 p = vec3(position.x + sway, y, position.z);

    // Motes near the axis are lit by the beam; distant ones fall to nothing.
    float r = length(p.xz);
    vGlow = exp(-r * 0.13) * (0.35 + aSeed * 0.65);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (90.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;
  varying float vGlow;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float falloff = 1.0 - smoothstep(0.0, 0.25, d);
    gl_FragColor = vec4(uColor * falloff * vGlow * 1.4, 1.0);
  }
`;

// ---- scene -----------------------------------------------------------------

export interface BeamHandle {
  group: any;
  bloom: any;
  composer: any;
  /** Runs one frame of scene logic. Registered on the clock; exposed so the
   *  camera path and bloom can be driven and measured without a live rAF. */
  step: (t: number, dt: number) => void;
  /** Live 0..1 presence per stop id, written once per frame. */
  focusOf: Record<string, number>;
  /** Live 0..1 white-out dive intensity. */
  diveRef: { value: number };
  /** Live 0..1 gate for stop typography; shut until a dive has been crossed. */
  revealRef: { value: number };
  /** Live 1..0 beam life. Drops to 0 past the dive peak, under the white. */
  lifeRef: { value: number };
  /** The post-bloom white-out pass. */
  flashPass: any;
  uniforms: { rampFreq: { value: number }; rampDrift: { value: number }; shared: any };
  dispose: () => void;
}

export async function initLightBeam(api: StageApi): Promise<BeamHandle> {
  const { THREE, scene, camera, renderer } = api;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pure void. The beam is the only thing emitting, so the ground must be a
  // true zero or the bloom threshold has nothing to bite against.
  scene.background = new THREE.Color(0x000000);

  const group = new THREE.Group();
  scene.add(group);

  const shared = {
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    // Stop reaction, shared so the core and the haze fray together.
    uSplinter: { value: 0 },
    uSpread: { value: 0 },
    // Dive blow-out. Multiplies the whole beam so being inside the core
    // overwhelms the frame from the geometry outward, rather than the white
    // being painted on by post alone.
    uBoost: { value: 1 },
    // Solitary pump: exactly one crest every 3.0s, sweeping a 150-unit span
    // centred on the camera — comfortably more than the visible column, so the
    // wave is born off the top of frame and dies off the bottom rather than
    // popping into existence mid-screen.
    uPumpPeriod: { value: PUMP_PERIOD },
    uPumpSpan: { value: PUMP_SPAN },
    uPumpWidth: { value: 9 },
    uPumpGain: { value: reduced ? 0.9 : PUMP_GAIN },
    uCamY: { value: 0 },
    // Global dimmer for the whole beam. Driven by the portal so detail mode
    // opens onto a pitch-black void rather than a lit stage.
    uFade: { value: 1 },
    uColorA: { value: new THREE.Color(CYAN) },
    uColorB: { value: new THREE.Color(VIOLET) },
  };

  // 20 world-unit wavelength. Shared so both layers band identically — if the
  // core and the haze disagreed on colour the beam would fringe.
  //
  // Swept against the framebuffer at 60 / 30 / 20 / 14. The camera is pitched
  // down the beam, so perspective crowds a large world-Y span into frame; 60
  // rendered as flat cyan (hue spread 0.13), 20 puts violet at the top of frame
  // and cyan at the bottom (spread 0.38) and cycles the colour zones several
  // times across the descent. Below 14 the far field starts to band.
  const rampFreq = { value: (Math.PI * 2) / 20 };
  const rampDrift = { value: 0 };

  const makeBeamLayer = (
    width: number,
    opts: {
      coreExp: number; midExp: number; haloExp: number;
      coreGain: number; midGain: number; haloGain: number;
      intensity: number; flicker: number; order: number;
      whiteMix: number; sat: number;
    },
  ) => {
    const geo = new THREE.PlaneGeometry(width, BEAM_LENGTH, 1, 220);
    const mat = new THREE.ShaderMaterial({
      vertexShader: BEAM_VERT,
      fragmentShader: BEAM_FRAG,
      uniforms: {
        ...shared,
        uIntensity: { value: opts.intensity },
        uCoreExp: { value: opts.coreExp },
        uMidExp: { value: opts.midExp },
        uHaloExp: { value: opts.haloExp },
        uCoreGain: { value: opts.coreGain },
        uMidGain: { value: opts.midGain },
        uHaloGain: { value: opts.haloGain },
        // Continuous flicker is off: the brief asks for a solitary wave
        // "instead of a continuous flicker", and any residual churn competes
        // with the crest for the eye. Kept as a uniform so it can be dialled
        // back in without touching the shader.
        uFlickerAmt: { value: 0 },
        uRampFreq: rampFreq,
        uRampDrift: rampDrift,
        uWhiteMix: { value: opts.whiteMix },
        uSat: { value: opts.sat },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = opts.order;
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, geo, mat };
  };

  // The razor. Exponent 38 puts the white centre inside ~1.5% of the plane
  // width — a couple of pixels at rest, which bloom then blows outward.
  //
  // The mid/halo gains are deliberately low. Tuned by reading the framebuffer:
  // the first pass ran intensity 3.4 with midGain 0.34, which pushed the mid
  // term above 1.0 across a wide band, clipped after tone mapping and lit 96%
  // of the row — a floodlight, not a beam. Keeping the sum under 1.0 outside
  // the core is what preserves the edge.
  const core = makeBeamLayer(CORE_WIDTH, {
    coreExp: 38, midExp: 18, haloExp: 6.5,
    coreGain: 1.0, midGain: 0.12, haloGain: 0.020,
    intensity: 1.9, flicker: 1.0, order: 10,
    whiteMix: 0.7, sat: 1.35,
  });

  // The bleed. Wide, soft, dim — this is what makes the void feel like it has
  // air in it rather than the beam sitting on a flat black card.
  const haze = makeBeamLayer(HAZE_WIDTH, {
    coreExp: 14, midExp: 4.0, haloExp: 1.6,
    coreGain: 0.22, midGain: 0.13, haloGain: 0.055,
    intensity: 0.22, flicker: 0.55, order: 9,
    // No white in the haze at all — it exists purely to carry chroma into the
    // void, and any white here is what greys the bloom out.
    whiteMix: 0.0, sat: 1.6,
  });

  // ---- dust ----------------------------------------------------------------
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(DUST_COUNT * 3);
  const seed = new Float32Array(DUST_COUNT);
  for (let i = 0; i < DUST_COUNT; i++) {
    // Biased toward the axis so the volume reads densest inside the beam.
    const r = Math.pow(Math.random(), 1.7) * DUST_RADIUS;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * DUST_RANGE;
    pos[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = Math.random();
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    uniforms: {
      uTime: shared.uTime,
      uCamY: { value: 0 },
      uRange: { value: DUST_RANGE },
      uSize: { value: reduced ? 1.1 : 1.5 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(0x9fe8ff) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.renderOrder = 8;
  group.add(dust);

  // ---- the flash -----------------------------------------------------------
  //
  // The white-out cannot be made of beam any more. Up to now the blinding frame
  // WAS the beam, boosted and bloomed — which is fine right up until the beam
  // has to die inside it. Killing the source of the white kills the white, and
  // the threshold becomes a hard cut to black rather than a camera emerging
  // from a fade.
  //
  // So the white gets its own source: a clip-space quad, independent of the
  // camera and of anything in the scene. The beam can now die underneath it and
  // the flash fades off a void that no longer contains a beam.
  //
  // It is applied AFTER the bloom pass, not as geometry in the scene. As a
  // mesh it went through UnrealBloomPass, and bloom applied to a full-screen
  // uniform field simply multiplies it — so the frame stayed pinned at 255
  // until the flash fell under the bloom threshold and then collapsed all at
  // once. Measured: 100% white at 1.63vh, mean 62 at 1.66vh. Post-bloom, the
  // level maps straight through ACES and the exit sweeps real mid-greys.
  //
  // Still inside the composer rather than a DOM overlay on purpose — the
  // blow-out has to be true of the framebuffer itself, not of something
  // covering it.
  const FlashShader = {
    uniforms: { tDiffuse: { value: null }, uLevel: { value: 0 }, uRise: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D tDiffuse;
      uniform float uLevel;
      uniform float uRise;
      varying vec2 vUv;

      void main() {
        // The white does not flood the frame uniformly — it RISES. A front
        // sweeps from below the bottom edge to above the top as the dive
        // builds, so the threshold reads as light welling up from the floor
        // and consuming the view, rather than the exposure simply being pulled
        // on everything at once.
        //
        // vUv.y is 0 at the bottom of the frame. The front travels from -0.25
        // (fully off-screen below, nothing lit) to 1.25 (past the top, all lit)
        // so both ends of the sweep are clean.
        float front = mix(-0.25, 1.25, uRise);
        // Wide soft edge: a hard line would read as a wipe, not a glow.
        float fill = 1.0 - smoothstep(front - 0.55, front + 0.08, vUv.y);

        // A brighter lip just under the front — the leading edge of the glow.
        float lip = exp(-pow((vUv.y - front) * 4.5, 2.0)) * 0.35;

        float amt = clamp(fill + lip, 0.0, 1.4);
        gl_FragColor = texture2D(tDiffuse, vUv) + vec4(vec3(uLevel * amt), 0.0);
      }
    `,
  };

  // ---- post ----------------------------------------------------------------
  const [
    { EffectComposer },
    { RenderPass },
    { UnrealBloomPass },
    { ShaderPass },
    { OutputPass },
  ] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/ShaderPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Threshold sits above the haze and below the core, so the razor blooms hard
  // while the surrounding volume stays a volume instead of turning to fog.
  //
  // Radius is the value that matters most here and the easiest to overdo: at
  // 0.72 the glow reached the frame edge and the beam stopped reading as a
  // beam. 0.28 keeps the bleed inside roughly a fifth of the viewport.
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloom);
  // Flash sits between bloom and output: bloomed scene in, white added on top,
  // then tone-mapped once. Disabled entirely outside a dive so it costs a
  // no-op rather than a fullscreen pass on every ordinary frame.
  const flashPass = new ShaderPass(FlashShader);
  flashPass.enabled = false;
  composer.addPass(flashPass);
  // OutputPass applies the renderer's ACES tone map + sRGB at the very end,
  // which is what lets the core run far above 1.0 without clipping to a disc.
  composer.addPass(new OutputPass());

  let lastW = 0;
  let lastH = 0;
  let camY = 0;
  let camZ = CAM_Z;

  // Live 0..1 presence per stop. Written every frame, read by the stop scenes
  // and by the DOM overlays, so there is exactly one authority on "are we at
  // a stop" and nothing recomputes it from scroll independently.
  const focusOf: Record<string, number> = Object.fromEntries(
    STOPS.map((s) => [s.id, 0]),
  );

  // Live dive intensity, read by the DOM so the overlays can clear out of the
  // white-out instead of floating on top of it. A ref rather than a bare number
  // so consumers hold the live value, not a snapshot.
  const diveRef = { value: 0 };

  // How much stop UI may show. Zero on the approach to a dive and through the
  // white-out, rising only on the way out — so a stop's typography is revealed
  // BY crossing the threshold rather than being visible before it, wiped, and
  // shown again. Outside a dive window this is simply 1.
  const revealRef = { value: 1 };

  // THE MAGIC TRICK.
  //
  // The beam is an intro element. It dies at the peak of the dive, inside the
  // measured 100%-white plateau, so the swap is physically unobservable — you
  // travel through the core and arrive somewhere the beam simply is not.
  //
  // Held as a damped 1..0 value rather than a boolean because a bare
  // `s >= peak` flip is only invisible if a frame actually renders inside the
  // plateau. A scrollbar drag or an anchor jump can skip 1.3 -> 1.6 in one
  // frame, where the screen is only ~28% white, and the beam would blink out in
  // full view. Carrying a life value lets the blow-out be *held* until the kill
  // has completed, so the trick cannot be caught out by a skipped frame.
  const lifeRef = { value: 1 };

  const _dir = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _portalPos = new THREE.Vector3();
  const _portalLook = new THREE.Vector3();

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  const step = (t: number, dt: number) => {
    // Match Scene.astro's resize exactly. Sizing the composer from innerWidth
    // while the renderer sizes from the canvas box would put the post targets
    // at a different resolution than the frame they filter.
    const cv = renderer.domElement;
    const w = cv.clientWidth || innerWidth || 1;
    const h = cv.clientHeight || innerHeight || 1;
    if (w !== lastW || h !== lastH) {
      lastW = w;
      lastH = h;
      composer.setSize(w, h);
      composer.setPixelRatio?.(Math.min(devicePixelRatio, 2));
      bloom.setSize(w, h);
    }

    shared.uTime.value = t;
    shared.uEnergy.value = api.view.energy;
    // Slow chromatic drift so the colour zones are never quite where you left
    // them. Frozen under reduced-motion.
    if (!reduced) rampDrift.value = t * 0.18;

    // ---- camera: plunge down the beam --------------------------------------
    // Authored in viewport-heights, not in normalised progress, so a stop sits
    // at "200vh" regardless of how long the track later becomes.
    const s = api.view.scrollY / Math.max(1, api.view.vh);

    let focus = 0;
    for (const stop of STOPS) {
      const f = focusAt(s, stop);
      focusOf[stop.id] = f;
      if (f > focus) focus = f;
    }

    // ---- the white-out dive -------------------------------------------------
    const dv = diveAt(s);

    // Beam life. Dies past the peak, returns if you scroll back up through it —
    // the swap happens under white in both directions.
    const alive = s < DIVE.peak ? 1 : 0;
    // Outside the threshold entirely, the beam simply exists. Snapping here
    // stops a jump back to the hero from fading the beam in over open void.
    lifeRef.value = s <= DIVE.start ? 1 : damp(lifeRef.value, alive, 12, dt);

    // Effective blow-out: never less than what is needed to cover a kill still
    // in progress. This is the term that makes the trick skip-frame-proof.
    const killMask = s >= DIVE.peak ? lifeRef.value : 0;
    const effDive = Math.max(dv, killMask);
    diveRef.value = effDive;

    // Flip at 0.92, not 0.5. Purity measures 100% at dive 0.926 but only ~30%
    // at 0.5 — swapping at the midpoint would show the beam vanishing through
    // a half-transparent screen.
    group.visible = lifeRef.value > 0.92;

    // Before the peak the gate is shut outright; after it, (1 - dive) opens it
    // as the camera withdraws. Both terms are 0 exactly at the peak, so there
    // is no discontinuity where they meet. Keyed to effDive so the UI stays
    // hidden for any held white-out too.
    revealRef.value = s >= DIVE.peak ? 1 - effDive : 0;

    camY = damp(camY, -descent(s), 6, dt);

    // Pull in toward the axis at a stop: the descent has plateaued, so closing
    // distance is what keeps the moment from reading as the page having hung.
    // The dive overrides it entirely and takes the camera into the core.
    const restZ = CAM_Z - focus * 4.6;
    // Never reach exactly 0. At the axis the view direction and the billboard
    // yaw both degenerate to a zero vector and the frame NaNs out.
    const zTarget = restZ * (1 - dv) + DIVE_Z * dv;
    camZ = damp(camZ, Math.max(DIVE_Z, zTarget), 7, dt);

    // The beam frays and widens where the journey pauses.
    shared.uSplinter.value = damp(shared.uSplinter.value, focus * 0.34, 5, dt);
    shared.uSpread.value = damp(shared.uSpread.value, focus * 0.55, 5, dt);

    // Blow-out. Ramped on effDive^2 so the frame stays readable through most of
    // the approach and only detonates in the last part of it. Keyed to effDive,
    // not dv, so a kill still completing holds the frame white.
    shared.uBoost.value = 1 + effDive * effDive * DIVE_BOOST;
    renderer.toneMappingExposure = 1 + effDive * effDive * DIVE_EXPOSURE;
    bloom.strength = BLOOM_STRENGTH + effDive * (DIVE_BLOOM_STRENGTH - BLOOM_STRENGTH);
    bloom.radius = BLOOM_RADIUS + effDive * (DIVE_BLOOM_RADIUS - BLOOM_RADIUS);
    // Threshold to 0 means the bloom pass stops discriminating and lifts the
    // entire frame, which is what turns a bright core into a full white field.
    bloom.threshold = BLOOM_THRESHOLD * (1 - effDive);

    // Portal spike. Added on top of the dive's own bloom rather than replacing
    // it, and driven by the same peak curve as the FOV so the blow-out and the
    // distortion crest together — a spike that trailed the FOV would read as
    // two separate events instead of one tear.
    const portalPk = portalPeak(detail.progress);
    if (portalPk > 0.0005) {
      bloom.strength += portalPk * PORTAL_BLOOM_STRENGTH;
      bloom.radius += portalPk * PORTAL_BLOOM_RADIUS;
      // Dropping the threshold is what lets the spike catch the whole frame
      // rather than only the beam, so the blur is global for that instant.
      bloom.threshold *= 1 - portalPk * 0.85;
    }

    // The flash carries the last of the white on its own, so the beam is free
    // to disappear beneath it.
    //
    // Additive level, not an alpha. Two earlier shapes both produced a cliff:
    // measured 100% pure white at 1.61vh and 0% by 1.64vh. The cause was not
    // the curve — it was that an alpha veil at colour 14 lands above 1.0 linear
    // for almost its entire alpha range, so ACES pinned it to 255 until it
    // abruptly did not. Emitting light instead lets the exit sweep through
    // genuine mid-greys as the level falls, which is what "emerging from the
    // white" actually looks like.
    // Level ramps late, the front rises early. Separating them is what makes
    // the buildup gradual: the glow is already climbing the frame while it is
    // still dim, instead of the whole screen brightening at once at the end.
    const flashAmt = Math.pow(effDive, 1.8);
    flashPass.uniforms.uRise.value = Math.pow(effDive, 0.72);
    flashPass.uniforms.uLevel.value = flashAmt * FLASH_LEVEL;
    flashPass.enabled = flashAmt > 0.0004;

    // Portal contribution to the flash, applied AFTER the dive has written its
    // own values — folding it into the bloom block above would be overwritten
    // by these two lines a moment later.
    if (portalPk > 0.0005) {
      // Squared so the white only really arrives at the very crest, leaving
      // the approach as distortion rather than as a wash.
      flashPass.uniforms.uLevel.value += portalPk * portalPk * 3.4;
      flashPass.uniforms.uRise.value = Math.max(flashPass.uniforms.uRise.value, portalPk);
      flashPass.enabled = flashPass.enabled || portalPk > 0.02;
    }

    // Pointer sway is suppressed through the dive — at 0.3 units from the axis
    // it would swing the camera through the beam rather than around it.
    const sway = 1 - dv;
    const px = (reduced ? 0 : api.pointer.x) * sway;
    const py = (reduced ? 0 : api.pointer.y) * sway;

    // ---- portal / detail mode ------------------------------------------------
    // Camera authority is handed over progressively rather than switched. At
    // progress 1 OrbitControls owns the camera outright and this writes
    // nothing; below that the scroll-driven pose is blended toward the model,
    // so entering and leaving are the same interpolation run in opposite
    // directions and cannot disagree.
    const dp = detail.progress;

    if (dp < 0.999) {
      camera.position.set(px * 1.4, camY + py * 0.9, camZ);

      // Aim slightly below the camera: the eye follows the beam downward into
      // where the journey is going.
      //
      // The dive rotates that gaze horizontal. This is not decoration — it is
      // what makes the blow-out possible. The beam is built from vertical
      // billboards, so a camera looking DOWN the axis sees them edge-on and the
      // frame goes dark exactly when it should go white. Levelling the gaze as
      // Z closes puts the plane face-on, filling frame with core.
      _look.set(0, camY - LOOK_AHEAD * (1 - dv), 0);
      camera.lookAt(_look);

      if (dp > 0.0005) {
        const target = (window as any).__detailTarget;
        if (target) {
          // Push in toward the model.
          _portalPos.set(target.x, target.y, target.z + target.dist);
          camera.position.lerp(_portalPos, dp);
          _look.lerp(_portalLook.set(target.x, target.y, target.z), dp);
          camera.lookAt(_look);
        }
      }
    }

    // FOV widens hard mid-transition and settles back — tunnel vision belongs
    // to the travel, not to the resting inspection view.
    const peak = portalPk;
    const fov = BASE_FOV + peak * PORTAL_FOV_KICK + dp * (DETAIL_FOV - BASE_FOV) * 0.35;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    dustMat.uniforms.uCamY.value = camY;
    // The solitary crest sweeps relative to the camera, so it needs to know
    // where the camera is.
    shared.uCamY.value = camY;

    // THE BLACK HOLE. Everything emissive dims to nothing across the portal,
    // so inspection happens against a true void — the vivid galaxy is exactly
    // the visual noise that makes overlay text hard to read and a matte product
    // hard to judge. Linear in progress rather than keyed to the peak: this
    // should be gone by the time the tear opens, not pulsing with it.
    shared.uFade.value = 1 - dp;

    // WARP. The pump's period collapses, so the one-crest-per-3s signal
    // accelerates toward a continuous strobe running down the column — the
    // beam's own way of expressing speed. Span widens with it so the crests
    // stay separated instead of collapsing into a flat glow.
    // Whichever is stronger. The portal and the nav warp are two routes to the
    // same sensation, so they share one speed term rather than stacking into a
    // double-speed strobe when a portal is opened mid-warp.
    const wv = Math.max(warp.value, peak);
    shared.uPumpPeriod.value = PUMP_PERIOD / (1 + wv * 11);
    shared.uPumpSpan.value = PUMP_SPAN * (1 + wv * 1.4);
    shared.uPumpGain.value = PUMP_GAIN * (1 + wv * 0.8);

    // ---- billboard ----------------------------------------------------------
    // Yaw only. Rotating on any other axis would tip the beam off vertical.
    _dir.subVectors(camera.position, group.position);
    group.rotation.y = Math.atan2(_dir.x, _dir.z);
  };

  const stopTick = api.onTick(step);

  const stopRender = api.setRenderOverride(() => {
    composer.render();
  });

  const dispose = () => {
    stopTick();
    stopRender();
    group.removeFromParent();
    core.geo.dispose();
    core.mat.dispose();
    haze.geo.dispose();
    haze.mat.dispose();
    dustGeo.dispose();
    dustMat.dispose();
    flashPass.dispose?.();
    composer.dispose?.();
    bloom.dispose?.();
  };

  return {
    group,
    bloom,
    composer,
    step,
    focusOf,
    diveRef,
    revealRef,
    lifeRef,
    flashPass,
    uniforms: { rampFreq, rampDrift, shared },
    dispose,
  };
}
