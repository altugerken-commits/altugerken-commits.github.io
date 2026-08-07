// FIRST STOP — NOMAD BREWER.
//
// Pure product visualisation. The model renders with the exact
// MeshStandardMaterials Blender exported: no custom shader, no material
// override, no per-fragment modification of any kind.
//
// The only thing this file does to the asset is place it — fit to the frame,
// centred on the stop, revealed and turned with scroll. Everything that makes
// it look like anything is the material data in the .glb plus the neutral PMREM
// environment the stage installs, which a standard material samples on its own.
//
// If this ever looks wrong, the fix belongs in Blender or in the environment,
// never here.

import { STOPS, stopDepth } from '../lib/stops';

const NOMAD = STOPS.find((s) => s.id === 'nomad')!;

/** Camera looks this far below itself; the object sits on that point. */
const LOOK_AHEAD = 7;
/** Longest axis, in world units, after fitting. */
const FIT = 4.8;

export interface NomadHandle {
  group: any;
  /** Bounding-sphere radius after fit — the portal uses it to frame the model. */
  radius: number;
  meshes: number;
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

  const { gltf } = await api.loadGLB('/models/nomad-brewer.glb');

  let meshes = 0;
  gltf.scene.traverse((c: any) => {
    if (c.isMesh) meshes++;
  });

  // Fit at load rather than in the file, so the source asset stays untouched.
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  const fit = FIT / Math.max(size.x, size.y, size.z || 1);
  gltf.scene.scale.setScalar(fit);
  gltf.scene.position.set(-centre.x * fit, -centre.y * fit, -centre.z * fit);

  group.add(gltf.scene);

  const radius = size.length() * 0.5 * fit;

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  let reveal = 0;

  const stop = api.onTick((_t: number, dt: number) => {
    const detail = (window as any).__detail;
    const held = detail?.stopId === 'nomad' && detail.progress > 0.01;

    // In detail mode the stop is pinned open regardless of scroll, because
    // scroll is locked and focus would otherwise decay to zero underneath it.
    const f = held ? 1 : (beam.focusOf.nomad ?? 0);
    reveal = damp(reveal, f, 5, dt);

    // The presentation turn stops once the user has the model in their hands —
    // an object that keeps rotating under a drag fights the drag.
    if (!held) group.rotation.y += dt * 0.22 * (0.25 + f);

    group.position.y = objectY - (1 - reveal) * 2.2;
    const s = 0.82 + reveal * 0.18;
    group.scale.set(s, s, s);
    group.visible = reveal > 0.002;
  });

  return {
    group,
    radius,
    meshes,
    dispose: () => {
      stop();
      group.removeFromParent();
    },
  };
}
