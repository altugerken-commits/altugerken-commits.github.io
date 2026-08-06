// SECOND STOP — SHIFU 26 BODYWORK.
//
// The car is loaded from shifu-26-bodywork.opt.glb, which the Blender pipeline
// exports as exactly three primitives named Carbon / Steel / Enamel. That
// naming is the whole point: it is what lets the carbon zone be treated
// completely differently from the structure without any geometry surgery here.
//
// Steel and enamel render solid. Carbon renders as a point cloud sampled off
// its surface — non-destructively, the mesh is never modified — and the cloud
// responds to scroll velocity like a wind tunnel: at rest the points sit on the
// skin, and as the visitor scrolls the flow lifts them off it and streams them
// down the body before they settle back.

import { STOPS, stopDepth } from '../lib/stops';

const SHIFU = STOPS.find((s) => s.id === 'shifu')!;

const LOOK_AHEAD = 7;
/** Points sampled across the carbon surface. */
const PARTICLES = 167000;
/** Applied on top of the pipeline's 4-unit normalisation. */
const MODEL_SCALE = 1.1;

const SOLID_VERT = /* glsl */ `
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

const SOLID_FRAG = /* glsl */ `
  precision highp float;

  uniform float uReveal;
  uniform float uEnamel;
  uniform vec3  uPurple;
  uniform vec3  uPink;
  uniform vec3  uOrange;
  uniform vec3  uYellow;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

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
    vec3 env = galaxyEnv(reflect(-V, N));

    // GLARE CONTROL.
    //
    // This previously ran a low fresnel exponent against a gain near 1.0, and
    // because env is the vivid galaxy palette, not a neutral grey studio,
    // every grazing surface picked up a near-full-intensity colour wash. On a
    // car-shaped object that is most of the silhouette, so the model blew out
    // into a single bright smear.
    //
    // Fix is a much steeper falloff plus a far lower gain: the highlight is now
    // confined to a thin edge, and the body is carried by a dim wrap term
    // instead. Premium metal reads dark with a controlled edge, not bright.
    float fres = pow(1.0 - ndv, mix(5.2, 4.4, uEnamel));
    vec3 base = mix(vec3(0.055, 0.058, 0.066), vec3(0.016, 0.016, 0.019), uEnamel);

    // Desaturated environment for the specular. Chroma belongs in the galaxy
    // behind the car; a mirror of it across the bodywork is what read as glare.
    float envL = dot(env, vec3(0.2126, 0.7152, 0.0722));
    vec3 envSpec = mix(vec3(envL), env, 0.35);

    vec3 col = base;
    col += envSpec * fres * mix(0.22, 0.3, uEnamel);
    col += envSpec * 0.05 * (1.0 - ndv);

    gl_FragColor = vec4(col * uReveal, 1.0);
  }
`;

const CARBON_VERT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uFlow;      // signed scroll direction, -1..1
  uniform float uEnergy;    // 0..1 scroll energy envelope
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3  uMin;       // carbon bounds, for streamwise position
  uniform vec3  uMax;

  attribute vec3 aNormal;
  attribute float aSeed;

  varying float vGlow;
  varying float vLift;

  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    vec3 p = position;

    // Streamwise coordinate: 0 at the nose, 1 at the tail. The wind tunnel
    // reading depends on displacement growing DOWNSTREAM, so a particle near
    // the front barely moves while one at the tail is fully in the wake.
    float sPos = clamp((p.z - uMin.z) / max(0.001, uMax.z - uMin.z), 0.0, 1.0);

    // Boundary layer: points detach along the surface normal first, then get
    // carried downstream. Lifting purely along Z would slide the cloud through
    // the body instead of off it.
    float turb = hash(aSeed * 91.7) - 0.5;
    float wobble = sin(uTime * (1.4 + aSeed) + aSeed * 33.0);

    // Scaled for "disperses and flows slightly", not for an explosion. On a
    // 4-unit body the earlier values pushed points up to ~1.4 units — a third
    // of the car — which reads as the bodywork disintegrating rather than as
    // airflow over it.
    float lift = uEnergy * (0.12 + sPos * 0.3);
    vec3 off = aNormal * lift * (0.16 + 0.2 * turb);
    // Downstream drift, signed by scroll direction so scrolling back up runs
    // the tunnel in reverse.
    off.z += uFlow * lift * (0.4 + sPos * 0.9);
    off.y += wobble * lift * 0.1;

    p += off;
    vLift = lift;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (1.0 + lift * 0.5) * (60.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;

    // Detached points glow hotter — that is the visual signature of the flow.
    vGlow = (0.35 + 0.65 * hash(aSeed * 13.1)) * uReveal * (1.0 + lift * 1.6);
  }
`;

const CARBON_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3 uCool;
  uniform vec3 uHot;

  varying float vGlow;
  varying float vLift;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (dot(c, c) > 0.25) discard;
    // Carbon at rest is near-black graphite; in the flow it heats toward the
    // galaxy's warm end, which is what makes dispersion legible at a glance.
    vec3 col = mix(uCool, uHot, clamp(vLift * 1.3, 0.0, 1.0));
    gl_FragColor = vec4(col * vGlow, 1.0);
  }
`;

export interface ShifuHandle {
  group: any;
  info: { carbonTris: number; particles: number; solidTris: number };
  dispose: () => void;
}

export async function initShifuStop(api: any, beam: any): Promise<ShifuHandle> {
  const { THREE, scene } = api;

  const objectY = -stopDepth(SHIFU) - LOOK_AHEAD;

  // Offset to the right, opposite its panel. Measured centred, the car covered
  // 70% of the frame and ran straight through the left-hand typography — the
  // showcase reads as "object one side, words the other", which needs the
  // object to actually vacate that side.
  const OFFSET_X = 1.55;

  const group = new THREE.Group();
  group.position.set(OFFSET_X, objectY, 0);
  scene.add(group);

  const { gltf } = await api.loadGLB('/models/shifu-26-bodywork.opt.glb');

  const nebU = (window as any).__nebula?.uniforms;
  const palette = {
    uPurple: nebU?.uPurple ?? { value: new THREE.Color(0x7b3ff2) },
    uPink: nebU?.uPink ?? { value: new THREE.Color(0xff3d9a) },
    uOrange: nebU?.uOrange ?? { value: new THREE.Color(0xff7a2f) },
    uYellow: nebU?.uYellow ?? { value: new THREE.Color(0xffc861) },
  };

  const reveal = { value: 0 };

  const makeSolid = (enamel: number) =>
    new THREE.ShaderMaterial({
      vertexShader: SOLID_VERT,
      fragmentShader: SOLID_FRAG,
      uniforms: { ...palette, uReveal: reveal, uEnamel: { value: enamel } },
      transparent: true,
      depthWrite: true,
      toneMapped: false,
    });

  const steelMat = makeSolid(0);
  const enamelMat = makeSolid(1);

  // Identify parts by node name, with the material name as a fallback — the
  // exporter preserves both, and relying on only one would make the pipeline
  // brittle to a rename at either end.
  let carbonMesh: any = null;
  let solidTris = 0;
  const disposables: any[] = [];

  gltf.scene.traverse((c: any) => {
    if (!c.isMesh) return;
    const name = `${c.name} ${c.material?.name ?? ''}`.toLowerCase();
    if (name.includes('carbon')) {
      carbonMesh = c;
      return;
    }
    c.material = name.includes('enamel') || name.includes('paint') ? enamelMat : steelMat;
    const g = c.geometry;
    solidTris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    disposables.push(g);
  });

  if (!carbonMesh) {
    throw new Error('carbon primitive not found in shifu-26-bodywork.opt.glb');
  }

  // The carbon mesh itself is removed from the render, but its geometry is left
  // untouched — the cloud is sampled from it, never in place of it. This is
  // what "non-destructive" means here: the source survives, and switching the
  // carbon back to a solid is a one-line change.
  carbonMesh.visible = false;

  const cg = carbonMesh.geometry;
  cg.computeBoundingBox();
  const bb = cg.boundingBox;

  // ---- surface sampling ------------------------------------------------------
  // Area-weighted barycentric sampling. Sampling vertices instead would cluster
  // points wherever the decimator happened to leave density, which on a CAD
  // mesh means the fasteners, not the panels.
  const pos = cg.attributes.position;
  const nor = cg.attributes.normal;
  const idx = cg.index;
  const triCount = idx ? idx.count / 3 : pos.count / 3;

  const cum = new Float64Array(triCount);
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let total = 0;
  const triIndex = (t: number, k: number) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);

  for (let t = 0; t < triCount; t++) {
    vA.fromBufferAttribute(pos, triIndex(t, 0));
    vB.fromBufferAttribute(pos, triIndex(t, 1));
    vC.fromBufferAttribute(pos, triIndex(t, 2));
    ab.subVectors(vB, vA);
    ac.subVectors(vC, vA);
    total += ab.cross(ac).length() * 0.5;
    cum[t] = total;
  }

  const pPos = new Float32Array(PARTICLES * 3);
  const pNor = new Float32Array(PARTICLES * 3);
  const pSeed = new Float32Array(PARTICLES);
  const nA = new THREE.Vector3();
  const nB = new THREE.Vector3();
  const nC = new THREE.Vector3();

  const pick = (r: number) => {
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  for (let i = 0; i < PARTICLES; i++) {
    const t = pick(Math.random() * total);
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;

    const i0 = triIndex(t, 0);
    const i1 = triIndex(t, 1);
    const i2 = triIndex(t, 2);
    vA.fromBufferAttribute(pos, i0);
    vB.fromBufferAttribute(pos, i1);
    vC.fromBufferAttribute(pos, i2);

    pPos[i * 3] = vA.x * w + vB.x * u + vC.x * v;
    pPos[i * 3 + 1] = vA.y * w + vB.y * u + vC.y * v;
    pPos[i * 3 + 2] = vA.z * w + vB.z * u + vC.z * v;

    if (nor) {
      nA.fromBufferAttribute(nor, i0);
      nB.fromBufferAttribute(nor, i1);
      nC.fromBufferAttribute(nor, i2);
      const nx = nA.x * w + nB.x * u + nC.x * v;
      const ny = nA.y * w + nB.y * u + nC.y * v;
      const nz = nA.z * w + nB.z * u + nC.z * v;
      const len = Math.hypot(nx, ny, nz) || 1;
      pNor[i * 3] = nx / len;
      pNor[i * 3 + 1] = ny / len;
      pNor[i * 3 + 2] = nz / len;
    }
    pSeed[i] = Math.random();
  }

  const cloudGeo = new THREE.BufferGeometry();
  cloudGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  cloudGeo.setAttribute('aNormal', new THREE.BufferAttribute(pNor, 3));
  cloudGeo.setAttribute('aSeed', new THREE.BufferAttribute(pSeed, 1));

  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: CARBON_VERT,
    fragmentShader: CARBON_FRAG,
    uniforms: {
      uTime: beam.uniforms.shared.uTime,
      uReveal: reveal,
      uFlow: { value: 0 },
      uEnergy: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
      // Small. 167k additive points at any real size become a haze that covers
      // the frame regardless of how compact the car itself is.
      uSize: { value: 0.95 },
      uMin: { value: bb.min.clone() },
      uMax: { value: bb.max.clone() },
      uCool: { value: new THREE.Color(0x12141a) },
      // Muted rather than the raw palette orange: 167k additive points at full
      // chroma summed into the same bloom that was blowing out the body.
      uHot: { value: palette.uOrange.value.clone().multiplyScalar(0.45) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const cloud = new THREE.Points(cloudGeo, cloudMat);
  cloud.frustumCulled = false;

  // Carry the model's own transform onto the cloud so points sit exactly on the
  // skin they were sampled from.
  carbonMesh.updateWorldMatrix(true, false);
  cloud.applyMatrix4(carbonMesh.matrixWorld);

  group.add(gltf.scene);
  group.add(cloud);

  const carbonTris = idx ? idx.count / 3 : pos.count / 3;

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  const stop = api.onTick((_t: number, dt: number) => {
    const f = beam.focusOf.shifu ?? 0;
    reveal.value = damp(reveal.value, f, 5, dt);

    // The wind tunnel. Energy is the asymmetric envelope from lib/loop — it
    // snaps up on a flick and glides back — and flow carries the sign, so
    // scrolling up runs the tunnel backwards.
    cloudMat.uniforms.uEnergy.value = damp(
      cloudMat.uniforms.uEnergy.value,
      api.view.energy * f,
      8,
      dt,
    );
    cloudMat.uniforms.uFlow.value = damp(cloudMat.uniforms.uFlow.value, api.view.flow, 6, dt);

    group.rotation.y += dt * 0.14 * (0.2 + f);
    group.position.y = objectY - (1 - reveal.value) * 2.4;
    // The Blender pipeline normalises the car's longest axis to 4 world units,
    // which at this camera distance covered ~69% of frame and ran through the
    // left-hand panel. MODEL_SCALE brings it back to one side of the frame.
    const s = MODEL_SCALE * (0.88 + reveal.value * 0.12);
    group.scale.set(s, s, s);
    group.visible = reveal.value > 0.002;
  });

  return {
    group,
    info: {
      carbonTris: Math.round(carbonTris),
      particles: PARTICLES,
      solidTris: Math.round(solidTris),
    },
    dispose: () => {
      stop();
      group.removeFromParent();
      cloudGeo.dispose();
      cloudMat.dispose();
      steelMat.dispose();
      enamelMat.dispose();
      for (const g of disposables) g.dispose();
    },
  };
}
