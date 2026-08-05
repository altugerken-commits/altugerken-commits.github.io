// SHIFU 26 — ZONED DISSOLVE, MASKED THROUGH TYPE
//
// The bodywork ships with three named materials, and that is the whole idea:
// the shell decomposes along its real material identity, not an arbitrary mask.
//
//   Carbon Fiber - Plain          -> point cloud. The skin is what leaves.
//   Steel - Satin                 -> untouched solid geometry.
//   Paint - Enamel Glossy (Black) -> untouched solid geometry.
//
// MODEL INTEGRITY — the hard rule for this file:
// Nothing here decimates, re-samples, welds, simplifies or otherwise edits any
// BufferGeometry. The carbon cloud is built by READING the position and normal
// attributes and emitting particles into a SEPARATE buffer; the source mesh is
// only hidden. Steel and enamel are never read, never touched, never re-lit
// per-material — mood is carried entirely by scene lights and
// scene.environmentIntensity, so their materials stay exactly as authored.
// Density comes from emitting `particlesPerVertex` jittered copies per original
// vertex, which is additive. If you ever need more density, raise that number;
// do not touch the geometry.

interface SceneAPI {
  THREE: any;
  scene: any;
  camera: any;
  renderer: any;
  pointer: { x: number; y: number };
  view: { progress: number; scrollY: number; vh: number };
  loadGLB: (url: string) => Promise<any>;
  onTick: (fn: (t: number, dt: number) => void) => () => void;
  setRenderOverride: (fn: (t: number, dt: number) => void) => () => void;
}

const CARBON = /carbon/i;
const NORM = 8; // long axis normalised to this many world units

export const params = {
  // ---- orientation -------------------------------------------------------
  rotationX: -Math.PI / 2,

  // ---- arrival -----------------------------------------------------------
  convergeSeconds: 2.8,
  scatterRadius: 5.5,

  // ---- cloud density (NON-DESTRUCTIVE) ------------------------------------
  // 16,733 carbon vertices x 10 = 167,330 particles. The source mesh is
  // untouched; these are extra points scattered in a disc tangent to each
  // vertex's own normal, so the cloud hugs the surface instead of fogging it.
  particlesPerVertex: 10,
  jitterFrac: 0.0045, // fraction of the model's long axis
  normalLift: 0.0015,

  pointSize: 1.7,
  drift: 0.045,
  colorNear: '#d3dae8',
  colorFar: '#48587a',

  // ---- cursor ------------------------------------------------------------
  pointerRadius: 0.34, // NDC
  pointerPush: 0.085, // NDC

  // ---- framing -----------------------------------------------------------
  // Object width / viewport width. The word spans ~86%, so at rest the S and
  // the U stay empty — deliberate. The dolly pushes the shell through them.
  viewportFill: 0.55,
  pitchDeg: 13,
  dollySpan: 4.6,
  dollyDamping: 3.2,

  // ---- mood --------------------------------------------------------------
  environmentIntensity: 0.14,
  keyIntensity: 4.2,
  rimIntensity: 6.0,
  accentIntensity: 1.6,
  accent: '#ff5e00',

  // ---- typographic stencil ------------------------------------------------
  maskEnabled: true,
  maskText: 'SHIFU',
  maskFill: 0.9, // fraction of viewport width the word spans
  maskTracking: '0.02em',
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
    float stagger = aSeed * 0.45;
    float p = clamp((uProgress - stagger) / max(1.0 - stagger, 0.0001), 0.0, 1.0);
    p = 1.0 - pow(1.0 - p, 3.0);

    vec3 pos = mix(position + aScatter, position, p);

    float t = uTime * 0.25 + aSeed * 6.2831853;
    pos += uDrift * vec3(sin(t), cos(t * 1.13), sin(t * 0.77)) * (1.0 - 0.65 * p);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vec4 clip = projectionMatrix * mv;

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
    if (d2 > 0.25) discard;
    float a = smoothstep(0.25, 0.0, d2);
    vec3 col = mix(uColorFar, uColorNear, vFade);
    gl_FragColor = vec4(col, a * mix(0.22, 0.72, vFade));
  }
`;

const MASK_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const MASK_FRAG = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uMask;
  uniform float uEnabled;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(uScene, vUv).rgb;
    float m = mix(1.0, texture2D(uMask, vUv).a, uEnabled);
    gl_FragColor = vec4(c * m, 1.0);
  }
`;

export async function initShifuShell(api: SceneAPI, url: string) {
  const { THREE, scene, camera, renderer } = api;

  const { root, meshes, triangles } = await api.loadGLB(url);

  // ---- orientation, centring, normalisation --------------------------------
  // Rotate FIRST, then measure, so the framing maths describes what the camera
  // will actually see rather than the asset's authored pose.
  const group = new THREE.Group();
  root.rotation.x = params.rotationX;
  group.add(root);
  scene.add(group);
  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const longestLocal = Math.max(size.x, size.y, size.z) || 1;

  root.position.sub(centre);          // transform only — geometry untouched
  group.scale.setScalar(NORM / longestLocal);
  group.updateMatrixWorld(true);

  // ---- split by material ---------------------------------------------------
  const carbonMeshes: any[] = [];
  root.traverse((c: any) => {
    if (!c.isMesh) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    if (mats.some((m: any) => CARBON.test(m?.name ?? ''))) carbonMeshes.push(c);
  });

  // ---- build the cloud (read-only over the source geometry) -----------------
  let uniforms: any = null;
  let pointCount = 0;
  let sourceVertices = 0;

  if (carbonMeshes.length) {
    const PPV = Math.max(1, Math.floor(params.particlesPerVertex));
    const jitter = params.jitterFrac * longestLocal;
    const lift = params.normalLift * longestLocal;

    for (const m of carbonMeshes) sourceVertices += m.geometry.getAttribute('position').count;
    pointCount = sourceVertices * PPV;

    const positions = new Float32Array(pointCount * 3);
    const scatter = new Float32Array(pointCount * 3);
    const seeds = new Float32Array(pointCount);

    const toGroup = new THREE.Matrix4();
    const nrmMat = new THREE.Matrix3();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    const t1 = new THREE.Vector3();
    const t2 = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const alt = new THREE.Vector3(1, 0, 0);
    const dir = new THREE.Vector3();
    const groupInv = new THREE.Matrix4().copy(group.matrixWorld).invert();

    let w = 0;
    for (const m of carbonMeshes) {
      m.updateWorldMatrix(true, false);
      toGroup.copy(groupInv).multiply(m.matrixWorld);
      nrmMat.getNormalMatrix(toGroup);

      const posAttr = m.geometry.getAttribute('position');
      const nrmAttr = m.geometry.getAttribute('normal');

      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i).applyMatrix4(toGroup);

        if (nrmAttr) n.fromBufferAttribute(nrmAttr, i).applyMatrix3(nrmMat).normalize();
        else n.copy(up);

        // orthonormal basis in the surface's tangent plane
        t1.copy(Math.abs(n.y) > 0.95 ? alt : up).cross(n).normalize();
        t2.copy(n).cross(t1).normalize();

        for (let j = 0; j < PPV; j++) {
          // j === 0 keeps the exact original vertex, so the true surface is
          // always represented; the rest are jittered around it.
          let px = v.x, py = v.y, pz = v.z;
          if (j > 0) {
            const r = jitter * Math.sqrt(Math.random());  // uniform over the disc
            const a = Math.random() * Math.PI * 2;
            const cs = Math.cos(a) * r, sn = Math.sin(a) * r;
            const lf = (Math.random() - 0.5) * 2 * lift;
            px += t1.x * cs + t2.x * sn + n.x * lf;
            py += t1.y * cs + t2.y * sn + n.y * lf;
            pz += t1.z * cs + t2.z * sn + n.z * lf;
          }

          positions[w * 3] = px;
          positions[w * 3 + 1] = py;
          positions[w * 3 + 2] = pz;

          dir.set(px, py, pz);
          if (dir.lengthSq() < 1e-6) dir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          dir.normalize();
          dir.x += (Math.random() - 0.5) * 0.9;
          dir.y += (Math.random() - 0.5) * 0.9;
          dir.z += (Math.random() - 0.5) * 0.9;
          dir.normalize().multiplyScalar(
            (params.scatterRadius / (NORM / longestLocal)) * (0.35 + Math.random() * 0.65),
          );
          scatter[w * 3] = dir.x;
          scatter[w * 3 + 1] = dir.y;
          scatter[w * 3 + 2] = dir.z;
          seeds[w] = Math.random();
          w++;
        }
      }
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

    const pts = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    pts.frustumCulled = false;
    group.add(pts);

    // The carbon SURFACE is now represented by the cloud. Hidden, not altered.
    for (const m of carbonMeshes) m.visible = false;
  }

  // ---- mood ----------------------------------------------------------------
  // Contrast over fill. No ambient: the form is allowed to fall into black.
  // environmentIntensity dims reflections scene-wide, so no material is edited.
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = params.environmentIntensity;

  const key = new THREE.DirectionalLight(0xffffff, params.keyIntensity);
  key.position.set(5.5, 7, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ab4ff, params.rimIntensity);
  rim.position.set(-7, 2.5, -6);
  scene.add(rim);
  const accent = new THREE.DirectionalLight(new THREE.Color(params.accent), params.accentIntensity);
  accent.position.set(2, -4, -3);
  scene.add(accent);

  // ---- typographic stencil -------------------------------------------------
  // The world renders to a target, then composites through the alpha of a
  // canvas-drawn word: visible inside the letterforms, black everywhere else.
  // The mask is screen-fixed, so the bodywork travels behind a static window.
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType });
  rt.texture.colorSpace = THREE.SRGBColorSpace;

  const maskCanvas = document.createElement('canvas');
  const maskTex = new THREE.CanvasTexture(maskCanvas);
  maskTex.colorSpace = THREE.SRGBColorSpace;

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadUniforms = {
    uScene: { value: rt.texture },
    uMask: { value: maskTex },
    uEnabled: { value: params.maskEnabled ? 1 : 0 },
  };
  quadScene.add(
    new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: quadUniforms,
        vertexShader: MASK_VERT,
        fragmentShader: MASK_FRAG,
        depthTest: false,
        depthWrite: false,
      }),
    ),
  );

  // Astro's Fonts API rewrites the family to a hashed name, so read the real
  // stack out of the CSS variable rather than guessing "Space Grotesk".
  const fontStack = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() ||
    'sans-serif';

  const drawMask = () => {
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    if (!w || !h) return;
    maskCanvas.width = w;
    maskCanvas.height = h;
    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    (ctx as any).letterSpacing = params.maskTracking;

    const probe = 200;
    ctx.font = `700 ${probe}px ${fontStack()}`;
    const measured = ctx.measureText(params.maskText).width || 1;
    const size = (probe * (w * params.maskFill)) / measured;
    ctx.font = `700 ${size}px ${fontStack()}`;
    ctx.fillText(params.maskText, w / 2, h / 2);
    maskTex.needsUpdate = true;
  };

  await document.fonts.ready;
  drawMask();

  // ---- framing -------------------------------------------------------------
  // Solve camera distance so the object's width is `viewportFill` of the
  // viewport, then split that distance into height and depth by the pitch.
  const frame = () => {
    const aspect = camera.aspect || 1;
    const halfFov = (camera.fov * Math.PI) / 180 / 2;
    const neededWidth = NORM / params.viewportFill;
    const dist = neededWidth / (2 * Math.tan(halfFov) * aspect);
    const pitch = (params.pitchDeg * Math.PI) / 180;
    return { y: dist * Math.sin(pitch), z: dist * Math.cos(pitch) };
  };

  // ---- tick ----------------------------------------------------------------
  let elapsed = 0;
  let dollyX = -params.dollySpan;
  const target = new THREE.Vector3();

  api.onTick((t, dt) => {
    elapsed += dt;
    if (uniforms) {
      uniforms.uTime.value = t;
      uniforms.uProgress.value = Math.min(1, elapsed / params.convergeSeconds);
      uniforms.uPointer.value.set(api.pointer.x, api.pointer.y);
    }
    const { y, z } = frame();
    const wanted = -params.dollySpan + api.view.progress * params.dollySpan * 2;
    dollyX += (wanted - dollyX) * (1 - Math.exp(-params.dollyDamping * dt));
    camera.position.set(dollyX, y, z);
    target.set(dollyX, 0, 0);
    camera.lookAt(target);
  });

  // Named rather than inline so the composite can be driven by hand — useful
  // for verification, and for stepping the pipeline when the tick is paused.
  const renderMasked = () => {
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    if (rt.width !== w || rt.height !== h) {
      rt.setSize(w, h);
      drawMask();
    }
    quadUniforms.uEnabled.value = params.maskEnabled ? 1 : 0;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(quadScene, quadCam);
  };

  api.setRenderOverride(renderMasked);

  const info = {
    meshes,
    triangles,
    carbonMeshes: carbonMeshes.length,
    sourceVertices,
    pointCount,
    params,
    uniforms,
    group,
    drawMask,
    frame,
    renderMasked,
  };
  (window as any).__shifuScene = info;
  return info;
}
