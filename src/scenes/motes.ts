// DUST IN THE BEAM.
//
// A sparse field of motes hanging in the volume around the products. It exists
// for one reason: a light you cannot see is just a shading model. Give the beam
// something to catch and the light becomes an object in the room, which is the
// entire premise of this direction.
//
// THIS IS NOT THE STARFIELD, and the differences are deliberate, because the
// previous build's galaxy is exactly what this must not become:
//
//   - 420 motes, not 26,000. This is air, not space.
//   - strictly monochrome warm-white. No purple, no pink, no cyan. That palette
//     is the single most recognisable AI design fingerprint there is.
//   - confined to a box around the products rather than filling a sphere to
//     the far plane, so it reads as depth in a room instead of a void.
//   - brightness is driven by the KEY LIGHT's direction. Scrolling swings the
//     light, and the motes on that side flare while the others fall away — so
//     the dust reports where the light is rather than twinkling at random.
//
// depthTest is ON. It is off-by-default thinking that put the old nebula in
// front of solid geometry: three draws the transparent queue after the opaque
// one and renderOrder only sorts WITHIN a queue, so without a depth test
// nothing can occlude an additive layer. depthWrite stays off so the motes do
// not occlude each other.

import { onFrame } from '../lib/loop';
import { detail } from '../lib/detail';

const COUNT = 420;
/** The box the motes occupy, in world units, centred on the origin. */
const SPAN = { x: 17, y: 11, z: 9 };

export function initMotes(api: any) {
  const { THREE, scene, lights } = api;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT);
  const scale = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    pos[i * 3 + 0] = (Math.random() - 0.5) * SPAN.x;
    pos[i * 3 + 1] = (Math.random() - 0.5) * SPAN.y;
    pos[i * 3 + 2] = (Math.random() - 0.5) * SPAN.z;
    seed[i] = Math.random() * 100;
    // Cubed so most motes are small and a handful are notably larger. A
    // uniform distribution reads as a regular pattern however random the
    // positions are, because the eye latches onto consistent size.
    scale[i] = Math.pow(Math.random(), 3) * 0.85 + 0.15;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const uniforms = {
    uTime: { value: 0 },
    uLightDir: { value: new THREE.Vector3(-0.4, 0.7, 0.6) },
    uFade: { value: 1 },
    uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    uWarm: { value: new THREE.Color(0xffd9a8) },
    uCool: { value: new THREE.Color(0x9fb4d0) },
    uSpanY: { value: SPAN.y },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed;
      attribute float aScale;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSpanY;
      uniform vec3 uLightDir;
      varying float vLit;
      varying float vAlpha;

      void main() {
        vec3 p = position;

        // Slow convection: a steady rise plus a lazy lateral wander, each mote
        // on its own phase. Wrapped with mod so the field never empties.
        float rise = uTime * 0.055 + aSeed;
        p.y = mod(p.y + rise + uSpanY * 0.5, uSpanY) - uSpanY * 0.5;
        p.x += sin(uTime * 0.18 + aSeed * 6.2) * 0.42;
        p.z += cos(uTime * 0.14 + aSeed * 4.7) * 0.32;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);

        // How much this mote faces the key light. normalize guards against a
        // zero-length direction on the first frame before the orbit has run.
        vec3 toLight = normalize(uLightDir);
        vLit = clamp(dot(normalize(p), toLight) * 0.5 + 0.5, 0.0, 1.0);

        // Fade motes that drift close to the camera. A mote at 1 unit fills a
        // large part of the frame and reads as a smudge on the lens.
        vAlpha = smoothstep(1.5, 5.0, -mv.z);

        gl_Position = projectionMatrix * mv;
        gl_PointSize = aScale * 26.0 * uPixelRatio / max(0.001, -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      uniform float uFade;
      varying float vLit;
      varying float vAlpha;

      void main() {
        // Round, soft-edged point. Discarding outside the disc keeps the
        // square sprite from showing at larger sizes.
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float core = 1.0 - smoothstep(0.0, 0.5, r);

        // Warm where the light hits, cool where it does not — the same
        // warm-core/cool-falloff rule the CSS glow tokens follow.
        vec3 tint = mix(uCool, uWarm, vLit);

        // The lit side is several times brighter than the unlit side. This is
        // the whole point: as the key swings with scroll, the flare travels
        // across the field.
        float lit = 0.12 + pow(vLit, 2.2) * 0.88;

        gl_FragColor = vec4(tint, core * lit * vAlpha * 0.55 * uFade);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  // Behind the products in the transparent queue; the depth test does the real
  // occlusion work, this only orders the additive layers among themselves.
  points.renderOrder = -10;
  scene.add(points);

  const stop = onFrame((t) => {
    // Reduced motion freezes the drift but keeps the field — it is texture, and
    // removing it entirely would leave the light with nothing to act on. The
    // lighting response stays live because it follows scroll, which the user
    // is driving themselves.
    uniforms.uTime.value = reduced ? 0 : t;

    if (lights?.key) {
      // The light's world position IS its direction for a DirectionalLight
      // aimed at the origin.
      uniforms.uLightDir.value.copy(lights.key.position).normalize();
    }

    // Gone by the time inspection settles: at the framing distance the camera
    // sits inside the mote box, and dust between the lens and the subject is
    // just haze over the thing you asked to look at.
    uniforms.uFade.value = 1 - detail.progress;
  });

  return { points, uniforms, stop, count: COUNT };
}
