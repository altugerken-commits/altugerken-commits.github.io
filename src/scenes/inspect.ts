// DETAIL MODE — free-roam inspection.
//
// The transition is a dolly, not a portal. The cosmic build tore a hole by
// kicking the FOV to 142° and blowing the frame to white; on a paper ground
// that would just be a smear. Here the subject leaves its layout box, settles
// at the origin, and the camera pushes in to frame it. Everything is a pure
// function of detail.progress, so the exit is the entrance run backwards
// rather than a second animation kept in agreement with the first.
//
// TWO BUGS ARE DESIGNED OUT HERE, both of which previously left the controls
// completely dead with no error:
//
//   1. State lives at globalThis.__altug_detail__, reached through lib/detail.
//      An earlier version read `window.__detail`, which has never existed —
//      so every guard read `undefined`, and the controls were never enabled.
//
//   2. `main.layer` is a full-height element at z-index 1 sitting directly over
//      the canvas, so it hit-tests every pointer event before OrbitControls can
//      see one. Dimming its children was not enough; the container itself still
//      swallows. It is disabled wholesale below, and the overlay panel re-enables
//      pointer-events on itself — a child may opt back in when an ancestor has
//      opted out.

import { onFrame, damp } from '../lib/loop';
import { detail } from '../lib/detail';

/** Air left around the subject inside the frame. */
const FRAME_MARGIN = 1.30;
/** Damping on the dolly, so an interrupted transition does not snap. */
const LAMBDA = 9;
/** Zoom bounds, as multiples of the solved framing distance. */
const ZOOM_IN = 0.55;
const ZOOM_OUT = 2.1;

export async function initInspect(api: any, studio: any) {
  const { camera, renderer } = api;
  const { OrbitControls } = await import(
    'three/examples/jsm/controls/OrbitControls.js'
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  // Panning is off on purpose. With a single object centred at the origin
  // there is nothing to pan TO, and a user who pans the subject off-frame has
  // no way to understand what happened or how to undo it.
  controls.enablePan = false;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.8;
  // Stop just short of both poles. Passing straight over the top flips the
  // up-vector and the object appears to snap upside down mid-drag.
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI - 0.12;

  const home = camera.position.clone();
  const homeFov = camera.fov;

  // Solved fresh on each entry: it depends on the subject's extent AND on the
  // window's aspect, either of which can change between one inspection and the
  // next.
  let frameDist = 12;
  let armed = false;

  const solveFraming = (slot: any) => {
    const halfFov = ((camera.fov * Math.PI) / 180) / 2;
    const aspect = camera.aspect || 1.6;

    // Solved from the model's EXTENT against the real frustum, not from a
    // bounding-sphere radius. A sphere radius is dominated by the long axis, so
    // for anything tall and thin it puts the camera inside the height it needs
    // to see. Solving vertical and horizontal separately and taking the larger
    // frames the whole object whatever its proportions.
    const distV = slot.size.y / 2 / Math.tan(halfFov);
    const distH = slot.size.x / 2 / (Math.tan(halfFov) * aspect);
    // Half the depth, because the near face sits that much closer than the
    // centre the distance is measured to.
    return Math.max(distV, distH) * FRAME_MARGIN + slot.size.z / 2;
  };

  onFrame((_t, dt) => {
    const p = detail.progress;
    const subject = detail.stopId ? studio.slotOf(detail.stopId) : null;

    if (!subject || p <= 0.001) {
      if (armed) {
        controls.enabled = false;
        armed = false;
        camera.position.copy(home);
        camera.fov = homeFov;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0, 0);
      }
      return;
    }

    if (!armed) {
      armed = true;
      frameDist = solveFraming(subject);
      controls.target.set(0, 0, 0);
      controls.minDistance = frameDist * ZOOM_IN;
      controls.maxDistance = frameDist * ZOOM_OUT;
    }

    // Controls are live only at rest. Handing the camera to the user while the
    // dolly is still writing to it produces two authorities on one transform,
    // and the visible result is a camera that fights the drag.
    const atRest = detail.mode === 'active';
    if (controls.enabled !== atRest) {
      controls.enabled = atRest;
      // Adopt the camera's live position as the orbit state on hand-off, so
      // the first drag continues from what is on screen instead of jumping to
      // wherever the controls last were.
      if (atRest) controls.update();
    }

    if (!atRest) {
      // ---- the dolly ----------------------------------------------------
      // The subject travels from its layout pose to the origin, and the camera
      // travels from rest to the framing distance. Both interpolate on the
      // same p, which is what makes the two legs mirror images.
      const s = subject;
      s.group.position.set(
        damp(s.group.position.x, 0, LAMBDA, dt),
        damp(s.group.position.y, 0, LAMBDA, dt),
        damp(s.group.position.z, 0, LAMBDA, dt),
      );
      s.group.scale.setScalar(damp(s.group.scale.x, 1, LAMBDA, dt));

      const z = home.z + (frameDist - home.z) * p;
      camera.position.set(
        damp(camera.position.x, 0, LAMBDA, dt),
        damp(camera.position.y, 0, LAMBDA, dt),
        z,
      );
      camera.lookAt(0, 0, 0);
    } else {
      // At rest the subject is pinned and the user owns the camera.
      subject.group.position.set(0, 0, 0);
      subject.group.scale.setScalar(1);
      controls.update();
    }
  });

  return {
    controls,
    /** Exposed for measurement — the framing solve is the fiddly part. */
    framingOf: (id: string) => {
      const slot = studio.slotOf(id);
      return slot ? solveFraming(slot) : null;
    },
  };
}
