// THE STUDIO — products staged against the document.
//
// ARCHITECTURE, and why it is not the previous one.
//
// The cosmic build put objects at fixed world coordinates and flew a camera
// down a 10-viewport track to visit them. That works when the surrounding
// layout is a void. It stops working the moment the page is an editorial grid,
// because then the object has to land in a SPECIFIC place next to specific
// type, at every breakpoint — and a camera on a track has no idea where the
// type is. Every layout change becomes a re-tuning of world coordinates.
//
// So it is inverted here. The camera never moves. Each product tracks a real
// DOM element — an empty box the layout reserves for it — and is positioned
// and scaled every frame to fill that box in screen space. The consequences:
//
//   - responsive is free. The box is laid out by CSS; the product follows.
//   - scroll is free. The box moves with the document; the product follows.
//   - type and object can never disagree about where the object is, because
//     the object's position is DERIVED from the type's layout.
//
// The one thing this owes the reader is that the box must have real dimensions
// before the first frame is useful. An anchor with zero height parks its
// product at scale 0, which is invisible rather than broken.

import { onFrame, damp, view } from '../lib/loop';
import { matteify } from '../lib/matte';
import { detail } from '../lib/detail';

export interface ProductSpec {
  id: string;
  url: string;
  /** CSS selector for the layout box this product fills. */
  anchor: string;
  /** Fraction of the anchor box the product's long axis occupies. */
  fill: number;
  /** Resting yaw, radians. The angle the product is "presented" at. */
  restY: number;
  /** Yaw swept across one full pass of the anchor through the viewport. */
  spin: number;
  /** Pre-rotation applied before measuring, for assets that export rolled. */
  fixRotX?: number;
}

export const PRODUCTS: ProductSpec[] = [
  {
    id: 'nomad',
    url: '/models/nomad-brewer.opt.glb',
    anchor: '[data-product="nomad"]',
    fill: 0.82,
    // Presented three-quarters on, turned slightly toward the type rather than
    // square to camera. A dead-on elevation reads as a CAD screenshot; the
    // three-quarter is the product-photography convention because it shows a
    // face and a side at once and lets the eye read depth.
    restY: -0.55,
    spin: 1.15,
    // The FBX exported rolled 180°. Applied before the bounding box is taken,
    // never after: Box3 measures world-space extents, so measuring first and
    // rotating second yields a box for the wrong orientation and every frame
    // computed from it is wrong.
    fixRotX: Math.PI,
  },
  {
    id: 'shifu',
    url: '/models/shifu-26-bodywork.opt.glb',
    anchor: '[data-product="shifu"]',
    fill: 0.92,
    // Mirrored, so the two products do not read as the same photograph twice.
    restY: 0.62,
    spin: -1.05,
  },
];

interface Slot {
  spec: ProductSpec;
  /** Outer group: position and scale, written from the anchor rect. */
  group: any;
  /** Inner group: rotation only, so scale and spin never fight. */
  pivot: any;
  el: HTMLElement | null;
  /** Un-scaled bounding size, measured once at load. */
  size: { x: number; y: number; z: number };
  /** Smoothed yaw, so scroll jumps do not snap the product. */
  yaw: number;
  /** Smoothed pointer tilt. */
  tiltX: number;
  tiltY: number;
  info: { meshes: number; triangles: number };
}

/** Radians per second of idle turntable. ~2 minutes per revolution. */
const IDLE_SPIN = 0.052;
/** Pointer parallax, radians at full deflection. */
const TILT = 0.055;
/** Damping rate for yaw and tilt. Higher is tighter. */
const LAMBDA = 6;

/**
 * THE KEY LIGHT ORBITS WITH SCROLL.
 *
 * This is the page's signature, and the reason the direction is "dark and
 * light-based" rather than just "dark". Scrolling does not move the camera and
 * does not move the product — it moves the SOURCE. Highlights travel across
 * the bodywork, the rim slides around the silhouette, and a face that was
 * black is suddenly the brightest thing on screen.
 *
 * It works because the products are Lambert: with no specular term, every
 * change you see is real diffuse falloff over real geometry rather than a
 * highlight sliding over a surface. That is also why it cannot produce glare
 * however far the light swings.
 *
 * The arc is a little over a quarter turn across the whole document. Enough
 * that any two sections are lit differently; small enough that no section is
 * lit from behind and lost.
 */
const KEY_ARC = Math.PI * 0.62;
/** Where the key starts, radians about +Y. Upper-front-left. */
const KEY_PHASE = -0.75;
/** Orbit radius and height of the key. */
const KEY_R = 5.4;
const KEY_Y = 4.2;
/** The rim trails the key around the far side, staying roughly opposite. */
const RIM_R = 4.6;
const RIM_Y = 2.6;

/**
 * Convert a DOM rect into world-space position and extent on the z = 0 plane.
 *
 * Everything the layout-tracking depends on is here. The camera looks down -Z
 * from +Z, so the plane the products live on is z = 0 and the distance is just
 * the camera's z. Visible height at that distance is the standard frustum
 * relation; width follows from aspect.
 */
function worldFromRect(
  rect: DOMRect,
  camera: any,
  canvasW: number,
  canvasH: number,
) {
  const dist = camera.position.z;
  const visH = 2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * dist;
  const visW = visH * camera.aspect;

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // Pixel centre -> normalised device coords -> world units on the plane.
  const ndcX = (cx / canvasW) * 2 - 1;
  const ndcY = -((cy / canvasH) * 2 - 1);

  return {
    x: (ndcX * visW) / 2,
    y: (ndcY * visH) / 2,
    w: (rect.width / canvasW) * visW,
    h: (rect.height / canvasH) * visH,
  };
}

export async function initStudio(api: any) {
  const { THREE, scene, camera, renderer, pointer, loadGLB, lights } = api;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Pointer parallax is a hover affordance. On touch there is no hover, and
  // reading a stale last-touch position as a sustained tilt is worse than no
  // tilt at all.
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const slots: Slot[] = [];

  for (const spec of PRODUCTS) {
    const { gltf, meshes, triangles } = await loadGLB(spec.url);

    const pivot = new THREE.Group();
    if (spec.fixRotX) gltf.scene.rotation.x = spec.fixRotX;
    pivot.add(gltf.scene);

    // Centre the model on its own bounding box before anything else, so the
    // pivot spins about the object's middle rather than about whatever origin
    // the CAD export happened to leave it at. Without this a product with an
    // off-centre origin wobbles instead of turning.
    const box = new THREE.Box3().setFromObject(pivot);
    const size = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    gltf.scene.position.sub(centre);

    matteify(gltf.scene, THREE);

    const group = new THREE.Group();
    group.add(pivot);
    group.visible = false;
    scene.add(group);

    slots.push({
      spec,
      group,
      pivot,
      el: document.querySelector<HTMLElement>(spec.anchor),
      size: { x: size.x, y: size.y, z: size.z },
      yaw: spec.restY,
      tiltX: 0,
      tiltY: 0,
      info: { meshes, triangles },
    });
  }

  // Anchors can arrive after this module does — a ClientRouter swap replaces
  // the document under a persisted canvas. Re-resolving on demand costs one
  // querySelector on the frames where a slot has no element, and nothing at
  // all once it does.
  const resolve = (s: Slot) => {
    if (!s.el || !s.el.isConnected) s.el = document.querySelector<HTMLElement>(s.spec.anchor);
    return s.el;
  };

  // Smoothed orbit angle. Damped rather than read raw from scroll so a wheel
  // flick sweeps the light instead of snapping it — the light has mass.
  let keyAngle = KEY_PHASE;

  const stop = onFrame((t, dt) => {
    const canvasW = renderer.domElement.clientWidth || 1;
    const canvasH = renderer.domElement.clientHeight || 1;

    // Detail mode takes the camera and drives the inspected product itself.
    const inDetail = detail.progress > 0.001;

    // ---- the light orbits with the page ------------------------------------
    // view.progress is document scroll 0..1, written once per frame by the
    // clock. Inside detail mode the orbit is handed to the pointer instead:
    // the page is frozen there, so scroll can no longer drive anything, and a
    // light you can move by moving the mouse is the right affordance while
    // inspecting an object up close.
    if (lights?.key) {
      const target = inDetail
        ? KEY_PHASE + KEY_ARC * (0.5 + pointer.x * 0.45)
        : KEY_PHASE + KEY_ARC * view.progress;
      keyAngle = damp(keyAngle, target, 3.2, dt);

      lights.key.position.set(
        Math.sin(keyAngle) * KEY_R,
        KEY_Y,
        Math.cos(keyAngle) * KEY_R,
      );
      // The rim stays roughly opposite so the contour edge always exists,
      // travelling around the far side as the key comes round the front.
      lights.rim.position.set(
        Math.sin(keyAngle + Math.PI * 0.85) * RIM_R,
        RIM_Y,
        Math.cos(keyAngle + Math.PI * 0.85) * RIM_R,
      );
    }

    for (const s of slots) {
      const el = resolve(s);
      if (!el) {
        s.group.visible = false;
        continue;
      }

      const rect = el.getBoundingClientRect();

      // Cull anything a viewport away from the frame. Rebuilding a matrix for
      // a product nobody can see is pure cost, and on this page only one is
      // ever on stage at a time.
      const onStage =
        rect.bottom > -canvasH * 0.5 &&
        rect.top < canvasH * 1.5 &&
        rect.width > 0 &&
        rect.height > 0;

      // The inspected product stays on stage regardless of where its anchor
      // sits, because the page is frozen behind the overlay and the anchor may
      // well be off-screen.
      const isSubject = inDetail && detail.stopId === s.spec.id;

      // Everything ELSE leaves the stage the moment detail mode starts, and
      // this is load-bearing rather than an optimisation. worldFromRect solves
      // screen-space placement from a camera assumed to be sitting on the +Z
      // axis looking at the origin; OrbitControls breaks that assumption the
      // instant the user drags. A second product left on stage would be placed
      // by that stale relation and slide around behind the overlay.
      if (inDetail && !isSubject) {
        s.group.visible = false;
        continue;
      }

      s.group.visible = onStage || isSubject;
      if (!s.group.visible) continue;

      // ---- placement ------------------------------------------------------
      // Skipped for the subject of detail mode: the inspect controller owns
      // the camera and the object's transform there, and writing a layout
      // position on the same frame would fight it.
      if (!isSubject) {
        const w = worldFromRect(rect, camera, canvasW, canvasH);

        // Fit the model's largest cross-section inside the box. Solving both
        // axes and taking the smaller is what guarantees the whole object is
        // inside the frame whatever its proportions — a single-axis fit
        // overflows the other one for anything tall and thin, which is exactly
        // what the brewer is.
        const fitX = w.w / Math.max(1e-6, s.size.x);
        const fitY = w.h / Math.max(1e-6, s.size.y);
        const scale = Math.min(fitX, fitY) * s.spec.fill;

        s.group.position.set(w.x, w.y, 0);
        s.group.scale.setScalar(scale);

        // ---- rotation -----------------------------------------------------
        // Progress of the anchor across the viewport: 0 as it enters from the
        // bottom, 1 as it leaves past the top. Centred on 0.5 so the resting
        // angle is what you see when the product is centred in the frame, and
        // the sweep is symmetric either side of it.
        const span = canvasH + rect.height;
        const p = span > 0 ? 1 - (rect.top + rect.height) / span : 0.5;
        const swept = s.spec.restY + (p - 0.5) * s.spec.spin;

        // The turntable is additive on top and runs only when motion is
        // welcome. A continuous rotation is a slow looping oscillation, which
        // is the specific thing reduced-motion asks you to drop.
        const idle = reduced ? 0 : t * IDLE_SPIN;

        s.yaw = damp(s.yaw, swept + idle, LAMBDA, dt);
        s.pivot.rotation.y = s.yaw;

        // Pointer parallax. Small, damped, and hover-gated: enough that the
        // object feels like it occupies space rather than being a sprite, far
        // short of anything that reads as a toy.
        if (finePointer && !reduced) {
          s.tiltX = damp(s.tiltX, -pointer.y * TILT, LAMBDA, dt);
          s.tiltY = damp(s.tiltY, pointer.x * TILT, LAMBDA, dt);
          s.pivot.rotation.x = s.tiltX;
          s.pivot.rotation.z = s.tiltY * 0.4;
        }
      }
    }
  });

  return {
    slots,
    stop,
    /** Look up a staged product by id — the inspect controller needs it. */
    slotOf: (id: string) => slots.find((s) => s.spec.id === id) ?? null,
    info: Object.fromEntries(slots.map((s) => [s.spec.id, s.info])),
  };
}
