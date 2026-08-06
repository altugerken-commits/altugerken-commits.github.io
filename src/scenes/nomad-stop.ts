// FIRST STOP — NOMAD BREWER.
//
// Placeholder geometry standing in for the brewer: stacked primitives, built
// to be replaced by a real .glb without anything else in this file changing.
//
// There is no lighting rig in this scene and there should not be one. Adding
// lights to light a placeholder would mean the look changes the moment the
// real mesh lands. Instead the material derives everything from where it sits
// relative to the beam: radial distance from the axis drives illumination, a
// fresnel term picks out the silhouette, and a scan band sweeps the form when
// the stop is active. Swap the geometry, keep the material, keep the look.

import { STOPS, stopDepth } from '../lib/stops';

const NOMAD = STOPS.find((s) => s.id === 'nomad')!;

/** Camera looks this far below itself; the object sits on that point. */
const LOOK_AHEAD = 7;

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uScan;
  uniform float uGlass;
  uniform vec3  uPurple;
  uniform vec3  uPink;
  uniform vec3  uOrange;
  uniform vec3  uYellow;
  uniform float uObjectY;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  // The galaxy, approximated as an environment. The real nebula is a noise
  // field on a sky sphere and far too costly to evaluate per surface fragment,
  // but its PALETTE is what the eye reads in a reflection — so the ramp is
  // reproduced from the same four colours, driven by the reflected direction.
  // The object therefore picks up the room it is standing in.
  vec3 galaxyEnv(vec3 dir) {
    float t = 0.5 + 0.5 * dir.y;
    float s = 0.5 + 0.5 * dir.x;
    vec3 c = mix(uPurple, uPink, smoothstep(0.15, 0.62, t));
    c = mix(c, uOrange, smoothstep(0.55, 0.9, t) * 0.85);
    c = mix(c, uYellow, smoothstep(0.72, 0.98, s) * 0.35);
    return c;
  }

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    float ndv = clamp(dot(N, V), 0.0, 1.0);

    vec3 R = reflect(-V, N);
    vec3 env = galaxyEnv(R);

    // Schlick-ish fresnel. Ceramic gets a soft wide falloff, glass a tight
    // bright edge — the exponent is what separates "matte" from "polished"
    // far more than base colour does.
    float fresCeramic = pow(1.0 - ndv, 3.4);
    float fresGlass   = pow(1.0 - ndv, 1.6);
    float fres = mix(fresCeramic, fresGlass, uGlass);

    // ---- dark matte ceramic -------------------------------------------------
    // Very dark, very diffuse. A matte body's whole character is that it takes
    // colour from the environment across a broad angle instead of mirroring it,
    // so the env term is wide and heavily attenuated.
    vec3 ceramic = vec3(0.018, 0.018, 0.021);
    ceramic += env * 0.09 * (0.35 + 0.65 * (1.0 - ndv));
    ceramic += env * fresCeramic * 0.55;

    // ---- frosted glass ------------------------------------------------------
    // Frost is forward scatter: bright at grazing angles, milky through the
    // middle, and it carries more of the environment than the ceramic does.
    vec3 glass = vec3(0.05, 0.055, 0.07);
    glass += env * 0.55 * fresGlass;
    glass += env * 0.16;
    // Milky interior — the give-away that it is frosted and not clear.
    glass += vec3(0.10, 0.11, 0.14) * (1.0 - fresGlass) * 0.6;

    vec3 col = mix(ceramic, glass, uGlass);

    // Scan band travelling up the form while the stop is held.
    float local = vWorldPos.y - uObjectY;
    float band = exp(-pow((local - (fract(uTime * 0.22) * 6.0 - 3.0)) * 2.2, 2.0));
    col += env * band * uScan * 0.5;

    gl_FragColor = vec4(col * uReveal, 1.0);
  }
`;

export interface NomadHandle {
  group: any;
  parts: { frosted: number; ceramic: number };
  dispose: () => void;
}

export async function initNomadStop(api: any, beam: any): Promise<NomadHandle> {
  const { THREE, scene } = api;

  // The camera holds at -stopDepth and aims LOOK_AHEAD below itself, so this
  // is the world Y that lands dead centre of frame during the pause.
  const objectY = -stopDepth(NOMAD) - LOOK_AHEAD;

  const group = new THREE.Group();
  group.position.set(0, objectY, 0);
  scene.add(group);

  // Palette is shared by reference with the nebula where possible, so the
  // object reflects the galaxy that is actually behind it.
  const nebU = (window as any).__nebula?.uniforms;
  const shared = {
    uTime: beam.uniforms.shared.uTime,
    uReveal: { value: 0 },
    uScan: { value: 0 },
    uObjectY: { value: objectY },
    uPurple: nebU?.uPurple ?? { value: new THREE.Color(0x7b3ff2) },
    uPink: nebU?.uPink ?? { value: new THREE.Color(0xff3d9a) },
    uOrange: nebU?.uOrange ?? { value: new THREE.Color(0xff7a2f) },
    uYellow: nebU?.uYellow ?? { value: new THREE.Color(0xffc861) },
  };

  const makeMat = (glass: number) =>
    new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { ...shared, uGlass: { value: glass } },
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

  const ceramic = makeMat(0);
  const frosted = makeMat(1);

  // The real model replaces the stacked-primitive placeholder.
  const { gltf } = await api.loadGLB('/models/nomad-brewer.glb');

  // Which surfaces read as frosted glass is decided from the exported material
  // NAMES, not from indices. The export carries "Plastic - Matte (Black)",
  // "Rubber - Bumpy", "Plastic - Glossy (Black)", "Stainless Steel - Brushed"
  // and friends; indices would silently re-map the moment the model is
  // re-exported with one more part.
  const GLOSSY = /glossy|steel|glass|cam|ekran|screen|metal/i;

  const geos: any[] = [];
  let glassParts = 0;
  let mattParts = 0;

  gltf.scene.traverse((c: any) => {
    if (!c.isMesh) return;
    const key = `${c.name} ${c.material?.name ?? ''}`;
    const isGlossy = GLOSSY.test(key);
    c.material = isGlossy ? frosted : ceramic;
    if (isGlossy) glassParts++;
    else mattParts++;
    geos.push(c.geometry);
  });

  // Normalise: the export is in its own units and its own origin, and the stop
  // frames a 4-unit object. Fitting here rather than in the file keeps the
  // source asset untouched.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  // 4.8 rather than the placeholder's ~4: the real brewer is a slimmer
  // silhouette than the stacked cylinders were, and at 3.6 it measured 2.8% of
  // frame against the placeholder's 6.7% — visibly under-scaled for a showcase.
  const fit = 4.8 / Math.max(size.x, size.y, size.z || 1);
  gltf.scene.scale.setScalar(fit);
  gltf.scene.position.set(-centre.x * fit, -centre.y * fit, -centre.z * fit);

  group.add(gltf.scene);
  const partCounts = { frosted: glassParts, ceramic: mattParts };

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  const stop = api.onTick((_t: number, dt: number) => {
    const f = beam.focusOf.nomad ?? 0;

    shared.uReveal.value = damp(shared.uReveal.value, f, 5, dt);
    shared.uScan.value = damp(shared.uScan.value, f, 3.5, dt);

    // Slow presentation turn, and a rise into place as the stop takes hold.
    group.rotation.y += dt * 0.22 * (0.25 + f);
    group.position.y = objectY - (1 - shared.uReveal.value) * 2.2;
    const s = 0.82 + shared.uReveal.value * 0.18;
    group.scale.set(s, s, s);
    group.visible = shared.uReveal.value > 0.002;
  });

  return {
    group,
    parts: partCounts,
    dispose: () => {
      stop();
      group.removeFromParent();
      for (const g of geos) g.dispose();
      ceramic.dispose();
      frosted.dispose();
    },
  };
}
