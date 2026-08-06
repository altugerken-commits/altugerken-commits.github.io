// THE VOID FLOOR — a galaxy you are not supposed to notice.
//
// Everything here is shaped by one constraint: it must never compete with the
// beam. Two consequences drive the whole design.
//
// 1. Stars are deliberately kept BELOW the bloom threshold (0.80). A star that
//    crosses it gets picked up by UnrealBloomPass, blooms into a soft blob and
//    instantly reads as a second light source in the scene. Staying under the
//    threshold means the starfield costs the bloom pass nothing and stays
//    pin-sharp — which is also what makes it read as distance rather than haze.
//
// 2. Parallax is differential, not a rotation. Rotating a star sphere around
//    the camera moves every star by the same angle and reads as the sky
//    sliding — cheap and obviously fake. Translating the field instead moves
//    near stars further across frame than far ones, which is the actual cue the
//    eye uses for depth. Per-star, scaled by radius, in the vertex shader.
//
// Distribution is biased toward a tilted plane so a galactic band emerges from
// where the stars are, rather than from adding a nebula layer that would have
// to be faint enough to be pointless anyway.

// Density and reach were set by measuring what actually lands in frame. The
// first pass scattered 2200 stars across a 900-unit shell: only 335 pixels of
// the frame ended up carrying a star (0.02%), which reads as a few stray dots
// rather than a galaxy, while the handful that were visible had to be bright
// enough to see — exactly backwards. Many more, much fainter, in a tighter
// volume gives a field you sense rather than count.
const COUNT = 26000;
/** Cylindrical shell around the beam axis. Nothing closer than this. */
const R_MIN = 90;
const R_MAX = 520;
/**
 * Y span. Tightened to the actual descent (0 -> -260) plus headroom, rather
 * than the generous -420..200 it started with.
 *
 * The field visibly thinned as the camera descended: 1578 stars in frustum at
 * the hero but only 367 at the first stop and 184 at the SHIFU region. That was
 * survivable while the beam dominated the frame. It is not survivable now the
 * beam dies at the dive and the starfield becomes the entire showcase
 * environment — the deepest part of the journey was also the emptiest.
 *
 * The cause is the camera sitting at the TOP of the volume: at Y 0 its frustum
 * looks down through the entire field, but by Y -260 most of the field is
 * behind it and the cone runs out into nothing. Merely tightening the span made
 * it worse at depth. The fix is to extend the floor well below the deepest
 * camera position (descent bottoms out at -260) and scale COUNT to hold density
 * per unit Y constant, so every depth sees a full column.
 */
const Y_MIN = -620;
const Y_MAX = 90;
/** Fraction of stars pulled toward the galactic band. */
const BAND_SHARE = 0.5;
/**
 * Shallower than it was (0.42). A steep tilt turns the band into a plane the
 * camera crosses once, which is a second source of density swing along the
 * descent on top of the Y span.
 */
const BAND_TILT = 0.16;
const BAND_TIGHTNESS = 70;

const VERT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3  uParallax;

  uniform vec3 uColorA;
  uniform vec3 uColorB;

  attribute float aSize;
  attribute float aBright;
  attribute float aSeed;
  /** 0 = beam cyan, 1 = beam violet. */
  attribute float aMix;
  /** How far this star is pulled toward white. */
  attribute float aWhite;

  varying float vBright;
  varying vec3  vTint;

  void main() {
    // Differential parallax: near stars take the full offset, far stars almost
    // none. This is the entire depth illusion.
    float radius = length(position.xz);
    float near = 1.0 - clamp((radius - ${R_MIN}.0) / (${R_MAX}.0 - ${R_MIN}.0), 0.0, 1.0);
    vec3 p = position + uParallax * (0.15 + near * 0.85);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Distance falloff is deliberately weak. Real size attenuation would make
    // the far field vanish; these should all sit near a pixel.
    gl_PointSize = max(1.0, uSize * aSize * uPixelRatio * (260.0 / max(0.001, -mv.z)));
    gl_Position = projectionMatrix * mv;

    // Barely-there twinkle. Enough to keep the field from looking printed on.
    float tw = 0.86 + 0.14 * sin(uTime * (0.35 + aSeed * 0.5) + aSeed * 40.0);
    vBright = aBright * tw;

    // Palette is derived from the beam's own colour uniforms rather than being
    // a second set of constants. Retune the beam and the sky follows, so the
    // environment can never drift out of agreement with the light in it.
    vTint = mix(mix(uColorA, uColorB, aMix), vec3(1.0), aWhite);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uOpacity;

  varying float vBright;
  varying vec3  vTint;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;
    float f = 1.0 - smoothstep(0.0, 0.25, d2);
    gl_FragColor = vec4(vTint * f * vBright * uOpacity, 1.0);
  }
`;

export interface StarfieldHandle {
  points: any;
  uniforms: any;
  dispose: () => void;
}

export function initStarfield(api: any, beam: any): StarfieldHandle {
  const { THREE, scene } = api;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pos = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  const bright = new Float32Array(COUNT);
  const seed = new Float32Array(COUNT);
  const mix = new Float32Array(COUNT);
  const white = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    // sqrt keeps the shell from bunching against the inner radius.
    const r = Math.sqrt(Math.random()) * (R_MAX - R_MIN) + R_MIN;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    let y: number;
    if (i / COUNT < BAND_SHARE) {
      // Gaussian-ish scatter around a tilted plane -> a galactic band.
      const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      y = x * BAND_TILT + g * BAND_TIGHTNESS;
      y = Math.max(Y_MIN, Math.min(Y_MAX, y + (Y_MIN + Y_MAX) * 0.5));
    } else {
      y = Y_MIN + Math.random() * (Y_MAX - Y_MIN);
    }

    pos[i * 3] = x;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;

    // Heavily skewed: a few stars carry most of the light, the rest are dust.
    // Brighter across the board than the "barely perceptible" tuning: the
    // brief is now a vivid galaxy with distinct stars. The skew stays heavy so
    // it still reads as a field with a few bright anchors rather than an even
    // dusting of identical dots.
    const t = Math.pow(Math.random(), 3.2);
    size[i] = 0.6 + t * 1.8;
    bright[i] = 0.06 + t * 0.42;
    seed[i] = Math.random();

    // Bias the field toward the cyan end — violet is the accent, as it is in
    // the beam. Brighter stars run whiter, which is how real fields read.
    mix[i] = Math.pow(Math.random(), 1.7);
    white[i] = 0.18 + t * 0.5;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aMix', new THREE.BufferAttribute(mix, 1));
  geo.setAttribute('aWhite', new THREE.BufferAttribute(white, 1));

  const uniforms = {
    uTime: beam?.uniforms?.shared?.uTime ?? { value: 0 },
    // Shared references, not copies — the sky tracks the beam's palette.
    uColorA: beam.uniforms.shared.uColorA,
    uColorB: beam.uniforms.shared.uColorB,
    uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    uSize: { value: 1.35 },
    uParallax: { value: new THREE.Vector3() },
    // The volume knob for the whole field.
    uOpacity: { value: 0.85 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    // Never occludes, never occluded. It is the floor of the scene.
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  points.renderOrder = -10;
  scene.add(points);

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  // Damped pointer. api.pointer is raw per-event; smoothing it here keeps the
  // field from snapping and is what makes the depth read as mass.
  let px = 0;
  let py = 0;
  // World units the field slides across a full pointer sweep. Sized by measured
  // on-screen shift, not by feel: at 26/16 the field moved ~8px and read as
  // static. Because the offset is scaled per-star by radius, near stars travel
  // several times this on screen while the far field barely moves — which is
  // the differential that sells the depth.
  const PARALLAX_X = 72;
  const PARALLAX_Y = 44;

  const stop = api.onTick((_t: number, dt: number) => {
    if (!reduced) {
      px = damp(px, api.pointer.x, 2.4, dt);
      py = damp(py, api.pointer.y, 2.4, dt);
    }
    // Opposite the cursor: the field slides against the movement, which is what
    // makes it sit behind everything else.
    uniforms.uParallax.value.set(-px * PARALLAX_X, -py * PARALLAX_Y, 0);
  });

  return {
    points,
    uniforms,
    dispose: () => {
      stop();
      points.removeFromParent();
      geo.dispose();
      material.dispose();
    },
  };
}
