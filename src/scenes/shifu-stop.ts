// SECOND STOP — SHIFU 26 BODYWORK.
//
// Pure product visualisation, same contract as the Nomad stop: the car renders
// with the exact MeshStandardMaterials the Blender pipeline exported — Carbon
// Fiber - Plain, Steel - Satin, Paint - Enamel Glossy (Black) — and nothing
// here touches them.
//
// Removed deliberately, and worth recording because it was a lot of machinery:
// the 167,000-point carbon cloud and its wind-tunnel displacement, the
// area-weighted surface sampler that fed it, and the custom solid shader with
// its galaxy-reflection environment. All of it is gone. The carbon mesh that
// used to be hidden so the cloud could stand in for it is now simply visible,
// which is what "non-destructive" was always protecting: the source geometry
// was never modified, so restoring it is a deletion, not a rebuild.

import { STOPS, stopDepth } from '../lib/stops';
import { matteify } from '../lib/matte';
import { detail } from '../lib/detail';

const SHIFU = STOPS.find((s) => s.id === 'shifu')!;

const LOOK_AHEAD = 7;
/** Longest axis in world units after fitting, before MODEL_SCALE. */
const FIT = 4.0;
/**
 * Applied on top of the fit. 1.1 -> 1.65 is exactly the requested 1.5x.
 */
const MODEL_SCALE = 1.65;
/** Offset opposite its panel so the car takes one side of the frame. */
const OFFSET_X = 1.55;

export interface ShifuHandle {
  group: any;
  radius: number;
  frameSize: { x: number; y: number; z: number };
  info: { meshes: number; triangles: number; materials: string[] };
  dispose: () => void;
}

export async function initShifuStop(api: any, beam: any): Promise<ShifuHandle> {
  const { THREE, scene } = api;

  const objectY = -stopDepth(SHIFU) - LOOK_AHEAD;

  const group = new THREE.Group();
  group.position.set(OFFSET_X, objectY, 0);
  scene.add(group);

  const { gltf, meshes, triangles } = await api.loadGLB(
    '/models/shifu-26-bodywork.opt.glb',
  );

  const matte = matteify(gltf.scene, THREE);

  // Fit and centre on load. The asset arrives in its own units and about its
  // own origin — the earlier Blender-normalised export is gone, and depending
  // on a normalisation baked into one particular export is exactly how a model
  // swap silently changes the composition.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  const fit = FIT / Math.max(size.x, size.y, size.z || 1);
  gltf.scene.scale.setScalar(fit);
  gltf.scene.position.set(-centre.x * fit, -centre.y * fit, -centre.z * fit);

  group.add(gltf.scene);

  const radius = size.length() * 0.5 * fit * MODEL_SCALE;
  /** World-space extent at final scale — what the portal must actually frame. */
  const frameSize = {
    x: size.x * fit * MODEL_SCALE,
    y: size.y * fit * MODEL_SCALE,
    z: size.z * fit * MODEL_SCALE,
  };

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  let reveal = 0;

  const stop = api.onTick((_t: number, dt: number) => {
    // See nomad-stop: this used to read a `window.__detail` global that never
    // existed, so the car auto-rotated through the whole of detail mode.
    const held = detail.stopId === 'shifu' && detail.progress > 0.01;

    const f = held ? 1 : (beam.focusOf.shifu ?? 0);
    reveal = damp(reveal, f, 5, dt);

    if (!held) group.rotation.y += dt * 0.14 * (0.2 + f);

    group.position.y = objectY - (1 - reveal) * 2.4;
    const s = MODEL_SCALE * (0.88 + reveal * 0.12);
    group.scale.set(s, s, s);
    group.visible = reveal > 0.002;
  });

  return {
    group,
    radius,
    frameSize,
    info: { meshes, triangles, materials: matte.names },
    dispose: () => {
      stop();
      group.removeFromParent();
    },
  };
}
