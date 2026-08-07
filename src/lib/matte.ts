// KILL THE GLARE.
//
// The products ship native GLTF materials, which Blender exports as
// MeshPhysicalMaterial — and physical materials carry a whole stack of
// specular lobes beyond plain roughness: clearcoat, sheen, iridescence,
// specular intensity, transmission. Raising roughness alone does not silence
// them, because clearcoat has its OWN roughness and sits on top of the base
// layer regardless of what the base is doing.
//
// So this flattens every lobe explicitly rather than tuning one number and
// hoping. It is applied per model after load.
//
// Note the tension, deliberately: the brief also asks for untouched native
// materials. These two cannot both be fully true. Geometry, material identity,
// names and base colours are all preserved — only the reflectance properties
// are flattened, and only enough to remove specular response.

export interface MatteOptions {
  /** Floor for roughness. 1 is fully diffuse. */
  minRoughness?: number;
  /** Ceiling for metalness. Metal without an environment reads black. */
  maxMetalness?: number;
}

export function matteify(
  root: any,
  opts: MatteOptions = {},
): { materials: number; names: string[] } {
  const minRoughness = opts.minRoughness ?? 0.92;
  const maxMetalness = opts.maxMetalness ?? 0.08;

  const seen = new Set<any>();
  const names: string[] = [];

  root.traverse((c: any) => {
    if (!c.isMesh || !c.material) return;
    const mats = Array.isArray(c.material) ? c.material : [c.material];

    for (const m of mats) {
      if (!m || seen.has(m)) continue;
      seen.add(m);
      names.push(m.name || '(unnamed)');

      // No environment contribution at all — this is the single biggest source
      // of "glossy glare" once any env map is present.
      if ('envMapIntensity' in m) m.envMapIntensity = 0;
      if ('envMap' in m) m.envMap = null;

      // Base layer to diffuse.
      if ('roughness' in m && typeof m.roughness === 'number') {
        m.roughness = Math.max(m.roughness, minRoughness);
      }
      if ('metalness' in m && typeof m.metalness === 'number') {
        m.metalness = Math.min(m.metalness, maxMetalness);
      }

      // Physical-only lobes. Each of these produces a highlight independently
      // of roughness, so each has to be zeroed by name.
      if ('clearcoat' in m) m.clearcoat = 0;
      if ('clearcoatRoughness' in m) m.clearcoatRoughness = 1;
      if ('specularIntensity' in m) m.specularIntensity = 0;
      if ('sheen' in m) m.sheen = 0;
      if ('iridescence' in m) m.iridescence = 0;
      if ('transmission' in m) m.transmission = 0;
      if ('reflectivity' in m) m.reflectivity = 0;

      // Flat shading would fracture the decimated CAD surfaces into visible
      // facets, so it stays off; smooth normals with no specular is the look.
      m.flatShading = false;
      m.needsUpdate = true;
    }
  });

  return { materials: seen.size, names };
}
