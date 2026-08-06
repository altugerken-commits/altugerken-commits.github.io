// THE DEEP VOID FLOOR — a nebula you should never quite catch looking at.
//
// This is the permanent atmosphere. The beam is an intro element and dies at
// the white-out; the nebula and the starfield are what the AEQUA and SHIFU
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

    // Most of the sky must be empty. Without this the layer becomes an even
    // wash, which reads as a lifted black point rather than as cloud.
    float cloud = smoothstep(0.44, 0.86, density);

    vec3 col = mix(uPurple, uPink, smoothstep(0.35, 0.75, hue));
    // Orange is the accent and stays rare — it is the one hue here that can
    // fight the beam's cyan if it spreads.
    col = mix(col, uOrange, smoothstep(0.68, 0.95, hue) * 0.55);

    // Thin the band toward the poles so it drifts rather than shelling the
    // camera evenly in every direction.
    float band = 1.0 - abs(vDir.y) * 0.55;

    gl_FragColor = vec4(col * cloud * band * uIntensity, 1.0);
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
    // The subtlety dial for this layer. Measured, not guessed: 0.16 put a
    // mean delta of 18/255 across ~45% of the frame, which is a visible violet
    // wash rather than "barely perceptible". For scale the starfield sits at
    // mean 11 across 0.17% of frame.
    uIntensity: { value: 0.055 },
    uOffset: { value: new THREE.Vector3() },
    uPurple: { value: new THREE.Color(0x6a3ad6) },
    uPink: { value: new THREE.Color(0xff4fa3) },
    uOrange: { value: new THREE.Color(0xff8a3d) },
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
