// SHIFU 26 — ZONED DISSOLVE
//
// The bodywork ships with three named materials, and that is the whole idea
// here: the shell decomposes along its real material identity rather than an
// arbitrary mask.
//
//   Carbon Fiber - Plain          -> point cloud. The skin is what leaves.
//   Steel - Satin                 -> stays solid. The structure survives.
//   Paint - Enamel Glossy (Black) -> stays solid.
//
// The same particle system runs the arrival and the interaction: uProgress 0 is
// a scattered cloud, 1 is the assembled skin, and the entry animation is just
// that uniform being driven from 0 to 1. Nothing extra is built for the intro.
//
// Everything tunable is on `params`, which is exposed at window.__shifuScene so
// values can be pushed live from the console without a rebuild.

interface SceneAPI {
  THREE: any;
  scene: any;
  camera: any;
  renderer: any;
  pointer: { x: number; y: number };
  view: { progress: number; scrollY: number; vh: number };
  loadGLB: (url: string) => Promise<any>;
  onTick: (fn: (t: number, dt: number) => void) => () => void;
}

const CARBON = /carbon/i;

export const params = {
  // arrival
  convergeSeconds: 2.6,
  scatterRadius: 5.5,

  // cloud
  pointSize: 2.4,
  drift: 0.05,
  colorNear: '#cfd6e4', // settled skin — cool, close to the ink of the old ladder
  colorFar: '#4a5a78', // still travelling — dimmer, bluer

  // cursor
  pointerRadius: 0.34, // NDC
  pointerPush: 0.09, // NDC

  // scroll dolly
  dollySpan: 5.2, // world units travelled along X
  cameraY: 1.5,
  cameraZ: 7.0,
  dollyDamping: 3.2,
};

const VERT = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uDrift;
  uniform vec2  uPointer;
  uniform float uPointerRadius;
  uniform float uPointerPush;

  attribute vec3  aScatter;
  attribute float aSeed;

  varying float vFade;

  void main() {
    // Per-particle stagger, so the cloud lands as a wave rather than a block.
    float stagger = aSeed * 0.45;
    float p = clamp((uProgress - stagger) / max(1.0 - stagger, 0.0001), 0.0, 1.0);
    p = 1.0 - pow(1.0 - p, 3.0);          // easeOutCubic

    vec3 pos = mix(position + aScatter, position, p);

    // Idle drift, damped as the particle settles: an assembled cloud that is
    // perfectly still reads as a mesh, not as suspended dust.
    float t = uTime * 0.25 + aSeed * 6.2831853;
    pos += uDrift * vec3(sin(t), cos(t * 1.13), sin(t * 0.77)) * (1.0 - 0.65 * p);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

    // Cursor repulsion in NDC, so the radius means the same thing at every
    // depth and on every viewport.
    vec2 ndc = clip.xy / clip.w;
    float d = distance(ndc, uPointer);
    float push = smoothstep(uPointerRadius, 0.0, d);
    ndc += normalize(ndc - uPointer + 1e-5) * push * uPointerPush;
    clip.xy = ndc * clip.w;

    vFade = p;
    gl_Position = clip;
    gl_PointSize = uSize * (300.0 / max(-mv.z, 0.001)) * (0.55 + 0.45 * aSeed);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorNear;
  uniform vec3 uColorFar;
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d2 = dot(c, c);
    if (d2 > 0.25) discard;                 // round point, no square artefacts
    float a = smoothstep(0.25, 0.0, d2);

    vec3 col = mix(uColorFar, uColorNear, vFade);
    gl_FragColor = vec4(col, a * mix(0.30, 0.85, vFade));
  }
`;

export async function initShifuShell(api: SceneAPI, url: string) {
  const { THREE, scene, camera } = api;

  const { root, meshes, triangles } = await api.loadGLB(url);

  // Centre on the origin and normalise the long axis to 8 units, so framing is
  // independent of the export scale.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const k = 8 / (Math.max(size.x, size.y, size.z) || 1);
  root.scale.setScalar(k);
  root.position.copy(centre).multiplyScalar(-k);

  const group = new THREE.Group();
  group.add(root);
  scene.add(group);

  // ---- split the shell by material ---------------------------------------
  const carbonMeshes: any[] = [];
  root.traverse((c: any) => {
    if (!c.isMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    if (mats.some((m: any) => CARBON.test(m?.name ?? ''))) carbonMeshes.push(c);
  });

  // ---- build the cloud from the carbon geometry ---------------------------
  let points: any = null;
  let uniforms: any = null;
  let pointCount = 0;

  if (carbonMeshes.length) {
    const chunks: Float32Array[] = [];
    for (const m of carbonMeshes) {
      const posAttr = m.geometry.getAttribute('position');
      const arr = new Float32Array(posAttr.count * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        // Bake the mesh's own transform in, so the cloud sits exactly where
        // the surface was rather than at the mesh's local origin.
        m.updateWorldMatrix(true, false);
        v.applyMatrix4(m.matrixWorld);
        group.worldToLocal(v);
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = v.z;
      }
      chunks.push(arr);
    }

    const total = chunks.reduce((n, c) => n + c.length, 0);
    const positions = new Float32Array(total);
    let o = 0;
    for (const c of chunks) { positions.set(c, o); o += c.length; }
    pointCount = positions.length / 3;

    // Scatter origins: pushed outward from the object's own centre so the
    // cloud implodes onto the form rather than sliding in from one side.
    const scatter = new Float32Array(positions.length);
    const seeds = new Float32Array(pointCount);
    const dir = new THREE.Vector3();
    for (let i = 0; i < pointCount; i++) {
      dir.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      dir.normalize();
      // jitter the direction so the shell edge does not stay readable in the cloud
      dir.x += (Math.random() - 0.5) * 0.9;
      dir.y += (Math.random() - 0.5) * 0.9;
      dir.z += (Math.random() - 0.5) * 0.9;
      dir.normalize().multiplyScalar(params.scatterRadius * (0.35 + Math.random() * 0.65));
      scatter[i * 3] = dir.x;
      scatter[i * 3 + 1] = dir.y;
      scatter[i * 3 + 2] = dir.z;
      seeds[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

    uniforms = {
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: params.pointSize },
      uDrift: { value: params.drift },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerRadius: { value: params.pointerRadius },
      uPointerPush: { value: params.pointerPush },
      uColorNear: { value: new THREE.Color(params.colorNear) },
      uColorFar: { value: new THREE.Color(params.colorFar) },
    };

    points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,          // additive dust must not occlude itself
        blending: THREE.AdditiveBlending,
      }),
    );
    points.frustumCulled = false;   // scatter puts vertices well outside the bounds
    group.add(points);

    // The carbon surface is now represented by the cloud.
    for (const m of carbonMeshes) m.visible = false;
  }

  // ---- provisional lighting ----------------------------------------------
  // The solid steel and gloss black need an environment to reflect and
  // something directional to catch, or they vanish into the ground. This is a
  // placeholder rig so the form reads while we decide what lights it.
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(api.renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88a0ff, 3.0);
  rim.position.set(-7, 2, -5);
  scene.add(rim);

  // ---- arrival + tick -----------------------------------------------------
  let elapsed = 0;
  let dollyX = -params.dollySpan;
  const target = new THREE.Vector3();

  api.onTick((t, dt) => {
    elapsed += dt;

    if (uniforms) {
      uniforms.uTime.value = t;
      // Arrival: drive uProgress 0 -> 1 once. Same uniform the interaction uses.
      uniforms.uProgress.value = Math.min(1, elapsed / params.convergeSeconds);
      uniforms.uPointer.value.set(api.pointer.x, api.pointer.y);
    }

    // Scroll dolly along the long axis. Camera and target travel together, so
    // the bodywork slides past the frame instead of pivoting in it.
    const wanted = -params.dollySpan + api.view.progress * params.dollySpan * 2;
    dollyX += (wanted - dollyX) * (1 - Math.exp(-params.dollyDamping * dt));
    camera.position.set(dollyX, params.cameraY, params.cameraZ);
    target.set(dollyX, 0, 0);
    camera.lookAt(target);
  });

  const info = {
    meshes,
    triangles,
    carbonMeshes: carbonMeshes.length,
    pointCount,
    params,
    uniforms,
    group,
  };
  (window as any).__shifuScene = info;
  return info;
}
