// KILL THE GLARE — BY CONSTRUCTION, NOT BY TUNING.
//
// Three rounds of tuning MeshPhysicalMaterial did not get there: roughness 1,
// metalness 0, clearcoat 0, specularIntensity 0, envMapIntensity 0 — and the
// brewer's lid still caught a highlight. The reason is that a physical
// material ALWAYS evaluates a specular BRDF. Roughness 1 spreads the lobe over
// the hemisphere, it does not remove it, so a bright enough light still leaves
// a broad sheen on a curved surface facing it.
//
// So the material is replaced rather than adjusted. MeshLambertMaterial has no
// specular term in its shader at all — it is diffuse only. There is no value
// of any parameter that can produce a highlight, which makes "zero glare" a
// property of the material model instead of a tuning that can drift.
//
// Lambert keeps directional shading, so the products still read as solid form
// rather than as flat silhouettes. That is why it is used in preference to
// MeshBasicMaterial, which is unlit and would render every surface at exactly
// its albedo — a paper cut-out.
//
// What is preserved: geometry, material name, base colour, opacity, side and
// vertex colours. What is discarded: every reflectance parameter, all of which
// existed only to describe specular response.

export interface MatteOptions {
  /** Multiplier on the source albedo. Below 1 darkens the product overall. */
  tone?: number;
}

export function matteify(
  root: any,
  THREE: any,
  opts: MatteOptions = {},
): { materials: number; names: string[]; converted: number } {
  const tone = opts.tone ?? 1;

  const cache = new Map<any, any>();
  const names: string[] = [];
  let converted = 0;

  const convert = (src: any) => {
    if (!src) return src;
    if (cache.has(src)) return cache.get(src);

    // Already diffuse-only: leave it be.
    if (src.isMeshLambertMaterial || src.isMeshBasicMaterial) {
      cache.set(src, src);
      return src;
    }

    const lambert = new THREE.MeshLambertMaterial({
      name: src.name,
      color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
      map: src.map ?? null,
      transparent: src.transparent ?? false,
      opacity: src.opacity ?? 1,
      side: src.side,
      vertexColors: src.vertexColors ?? false,
      // Emissive is a self-lit term, not a reflection, so it survives — but
      // nothing in these assets uses it.
      emissive: src.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    });

    if (tone !== 1) lambert.color.multiplyScalar(tone);

    // Reflections are the thing being removed; an env map would reintroduce
    // exactly what the swap is for.
    lambert.envMap = null;
    lambert.needsUpdate = true;

    cache.set(src, lambert);
    names.push(src.name || '(unnamed)');
    converted++;
    return lambert;
  };

  root.traverse((c: any) => {
    if (!c.isMesh || !c.material) return;
    c.material = Array.isArray(c.material)
      ? c.material.map(convert)
      : convert(c.material);
  });

  return { materials: cache.size, names, converted };
}
