// THE DEEP VOID FLOOR — a nebula you should never quite catch looking at.
//
// This is the permanent atmosphere. The beam is an intro element and dies at
// the white-out; the nebula and the starfield are what the Nomad and SHIFU
// showcases actually sit in. So it is deliberately NOT part of the beam group
// — nothing about the kill can reach it.
//
// Drawn as an inverted sphere locked to the camera, so it behaves as sky: it
// has no position in the world you can approach, only a direction. renderOrder
// -20 puts it beneath the starfield's -10, and with depthTest off it can never
// occlude or be occluded — it is simply the floor everything else sits on.
//
// Colour is the brief's purple/pink/orange, but at an intensity where the hue
// is felt rather than seen. The hard constraint is the same one the starfield
// has: it must stay far below the bloom threshold, or UnrealBloomPass lifts it
// into a glow that competes with the beam.

const RADIUS = 700;

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    // The sphere is never rotated, so object space direction IS world
    // direction — no need to carry a normal matrix through.
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIntensity;
  uniform vec3  uOffset;
  uniform vec3  uPurple;
  uniform vec3  uPink;
  uniform vec3  uOrange;
  uniform vec3  uYellow;
  uniform vec3  uPlanetDir;
  uniform float uPlanetR;
  uniform vec3  uPlanetRim;

  varying vec3 vDir;

  // Sin-free hash. This runs over every pixel of the frame at three octaves,
  // so the per-sample cost is the whole cost of the layer.
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  float fbm(vec3 p) {
    float s = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      s += a * vnoise(p);
      p *= 2.07;
      a *= 0.5;
    }
    return s;
  }

  void main() {
    vec3 p = vDir * 2.2 + uOffset;

    // Two decorrelated fields: one decides where cloud is, the other decides
    // what colour it is. Sharing one field would tie hue to density and the
    // whole sky would read as a single tinted blob.
    float density = fbm(p);
    float hue = fbm(p * 0.63 + vec3(11.3, 4.7, 19.1));

    // Wider than it was. The old 0.44-0.86 window left most of the sky empty,
    // which is what "too subtle" meant in practice — the colour existed but
    // almost nowhere. Opening the low end lets the cloud actually cover sky.
    float cloud = smoothstep(0.30, 0.78, density);
    // A brighter core inside the densest cloud gives the galaxy somewhere to
    // glow rather than reading as flat tinted fog.
    float core = smoothstep(0.62, 0.92, density);

    // Four-stop ramp across the vivid palette.
    vec3 col = mix(uPurple, uPink, smoothstep(0.28, 0.62, hue));
    col = mix(col, uOrange, smoothstep(0.58, 0.86, hue));
    col = mix(col, uYellow, smoothstep(0.82, 0.98, hue) * 0.8);

    float amt = cloud + core * 1.9;

    // ---- cosmic dust --------------------------------------------------------
    // Fine high-frequency filaments that SUBTRACT, carving dark lanes through
    // the cloud. Real nebulae read as dust in front of light, not as more
    // light — and because this layer blends additively, multiplying down is
    // the only way to get a dark structure at all.
    float dust = fbm(p * 3.7 + vec3(31.0, 7.0, 3.0));
    amt *= 1.0 - smoothstep(0.42, 0.78, dust) * 0.75;

    // Thin toward the poles so it drifts as a band rather than shelling the
    // camera evenly in every direction.
    amt *= 1.0 - abs(vDir.y) * 0.5;

    // ---- planet silhouette --------------------------------------------------
    // Carved out of the cloud rather than drawn on top: this layer is additive,
    // so nothing here can darken the frame directly. Multiplying the cloud down
    // to nothing inside the disc leaves a true void in the shape of a planet,
    // and a thin terminator rim is added back to imply a lit limb.
    float pd = distance(normalize(vDir), normalize(uPlanetDir));
    float disc = 1.0 - smoothstep(uPlanetR * 0.97, uPlanetR, pd);
    amt *= 1.0 - disc * 0.97;

    float rim = smoothstep(uPlanetR * 1.06, uPlanetR, pd)
              * (1.0 - smoothstep(uPlanetR, uPlanetR * 0.955, pd));
    // Rim only on the side facing the beam axis, so the light has a source.
    float lit = clamp(0.5 + 0.5 * dot(normalize(vDir - uPlanetDir), vec3(0.6, 0.5, 0.0)), 0.0, 1.0);

    vec3 outCol = col * amt * uIntensity + uPlanetRim * rim * lit * 0.5;

    gl_FragColor = vec4(outCol, 1.0);
  }
`;

export interface NebulaHandle {
  mesh: any;
  uniforms: any;
  dispose: () => void;
}

export function initNebula(api: any, beam: any): NebulaHandle {
  const { THREE, scene, camera } = api;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const uniforms = {
    uTime: beam?.uniforms?.shared?.uTime ?? { value: 0 },
    // Brief changed from "barely perceptible" to a vivid, eye-catching galaxy,
    // so this is deliberately an order of magnitude above the 0.055 it was
    // tuned to. The constraint that survives is the bloom threshold: the
    // galaxy must still sit under it, or UnrealBloomPass lifts the whole sky
    // into a haze that eats the beam.
    uIntensity: { value: 0.5 },
    uOffset: { value: new THREE.Vector3() },
    uPurple: { value: new THREE.Color(0x7b3ff2) },
    uPink: { value: new THREE.Color(0xff3d9a) },
    uOrange: { value: new THREE.Color(0xff7a2f) },
    uYellow: { value: new THREE.Color(0xffc861) },
    // Off to one side and below the horizon of travel, so it is found rather
    // than presented.
    uPlanetDir: { value: new THREE.Vector3(-0.62, -0.2, -0.76).normalize() },
    uPlanetR: { value: 0.2 },
    uPlanetRim: { value: new THREE.Color(0xffb37a) },
  };

  const geo = new THREE.SphereGeometry(RADIUS, 32, 20);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -20;
  scene.add(mesh);

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  let px = 0;
  let py = 0;

  const stop = api.onTick((t: number, dt: number) => {
    // Sky: always centred on the viewer, never approached.
    mesh.position.copy(camera.position);

    if (!reduced) {
      px = damp(px, api.pointer.x, 1.6, dt);
      py = damp(py, api.pointer.y, 1.6, dt);
    }

    // Much weaker than the starfield's parallax — this layer is further away,
    // and matching the stars would flatten the two into one plane.
    uniforms.uOffset.value.set(
      -px * 0.09,
      -py * 0.06 + camera.position.y * 0.0016,
      t * 0.006,
    );
  });

  return {
    mesh,
    uniforms,
    dispose: () => {
      stop();
      mesh.removeFromParent();
      geo.dispose();
      mat.dispose();
    },
  };
}
