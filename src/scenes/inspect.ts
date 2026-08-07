// FREE-ROAM INSPECTION.
//
// OrbitControls, but only ever live at the far end of the portal. Two rules
// keep it from fighting the rest of the site:
//
//   1. `enabled` is false unless detail mode is fully active. During the
//      transition the beam is still interpolating the camera, and a live
//      OrbitControls would write the camera in the same frame and the two would
//      tear against each other.
//
//   2. The controls are re-seeded from the live camera at the moment they take
//      over. OrbitControls derives its internal spherical coordinates from
//      camera position minus target; handing it a camera that moved while it
//      was disabled without re-seeding makes it snap on the first drag.

import { detail } from '../lib/detail';

export interface InspectHandle {
  controls: any;
  dispose: () => void;
}

export async function initInspect(api: any): Promise<InspectHandle> {
  const { THREE, camera, renderer } = api;
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  // Panning would let the model be dragged out of frame with no way back.
  controls.enablePan = false;
  controls.minDistance = 1.2;
  controls.maxDistance = 60;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.7;
  (window as any).__inspect = controls;

  let seeded = false;
  const target = new THREE.Vector3();

  const stop = api.onTick(() => {
    const active = detail.mode === 'active';

    if (active && !seeded) {
      const t = (window as any).__detailTarget;
      if (t) {
        target.set(t.x, t.y, t.z);
        controls.target.copy(target);
      }
      controls.update();
      controls.enabled = true;
      seeded = true;
    }

    if (!active && seeded) {
      controls.enabled = false;
      seeded = false;
    }

    if (controls.enabled) controls.update();
  });

  return {
    controls,
    dispose: () => {
      stop();
      controls.dispose();
    },
  };
}
