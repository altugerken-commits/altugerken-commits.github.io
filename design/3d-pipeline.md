# 3D Asset Pipeline — Fusion 360 → Web

**Owner:** 3D asset pipeline engineer
**Date:** 2026-08-04
**Status:** Recommendation. No real assets delivered yet — all geometry currently in the repo must be clearly-labelled placeholder.

---

## 0. TL;DR — the headline decision

**The hero should not be real-time WebGL geometry.**

The locked creative direction says: *the object stays still and monumental; the key light tracks the cursor with lag.* Read that literally. The camera never moves. The object never moves. The only thing that changes per frame is **the lighting solution over a fixed view**.

That is not a geometry problem. Shipping a triangle mesh, a PBR material system, an environment map and a renderer to the browser — so that all of it can produce *one fixed camera angle* — is paying the entire cost of real-time 3D to use approximately none of it.

The correct technique is **pre-rendered G-buffer relighting**: render the object once in Blender/Cycles from the locked camera, export the geometry buffers (albedo, camera-space normal, roughness/metal/AO, depth, alpha) as flat 2D images, and relight per-pixel in a ~60-line fragment shader on a single fullscreen quad.

| | Real-time glTF | G-buffer relight |
|---|---|---|
| Visual quality | Real-time approximation | Path-traced ground truth |
| Draw calls | 1–8 + env map convolution | **1** |
| Geometry payload | 250–900 KB | **0** |
| Frame cost | Scales with mesh + lights | **Constant.** One fullscreen quad |
| Type-behind-object occlusion | Needs depth sorting or a second pass | **Free** — it's an alpha channel |
| Risk if CAD is messy | High | **Zero** — never leaves Blender |

The occlusion device the client called "the single most important visual device" — type passes behind the object, object occludes the type — is a **matte**, not a depth test. An RGBA image with a clean alpha channel sitting between two DOM layers does this perfectly, at zero cost, with crisp anti-aliased edges that no real-time renderer will match at this budget.

This is the same reason Apple's product pages are image sequences and not WebGL.

**Three tiers, use the right one per surface:**

- **Tier A — G-buffer relight (hero).** Cursor-driven light, 2D input domain. This is the signature interaction. §5.
- **Tier B — real-time glTF (project detail pages, optional).** Only where the visitor genuinely orbits/inspects a model. Full pipeline in §1–§4.
- **Tier C — scroll-scrubbed image sequence (case-study reveals).** 1D scroll domain: turntables, exploded views. §6.

Tier A and Tier C are what the design direction actually calls for. Tier B is documented in full because the client asked, because it may earn a place on individual project pages, and because the decision should be revisited once real geometry arrives.

> **Why an image sequence cannot do the hero:** a scroll sequence is a 1-dimensional lookup (scroll progress → frame). The cursor is 2-dimensional (x, y → light position). Covering a 2D light domain with pre-rendered frames needs an N×M grid — a 12×12 grid is 144 renders, ~5 MB, and still visibly steps between cells. Tier A solves the 2D domain analytically in a shader. Do not try to fake the hero with a sequence.

---

## 1. Which Fusion 360 export format?

### The finding that drives everything: ignore Fusion's materials entirely

Fusion 360's material/appearance export is unreliable-to-broken in **every** format the client has available:

- **STEP / IGES** — appearances and physical materials are lost outright. ([Autodesk](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Appearances-and-physical-materials-are-lost-when-exporting-as-Step-or-IGS-from-Fusion-360.html))
- **OBJ** — only exports colors of *default* appearances, and only via "Save As Mesh". No textures. ([Autodesk](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Can-Fusion-export-bmeshes-with-an-mtl-file.html))
- **FBX** — carries *some* material IDs, but faces silently fall back to the default material unless the appearance was explicitly assigned with "Assign to → Faces". Fragile and easy to get wrong. ([Autodesk forums](https://forums.autodesk.com/t5/fusion-support-forum/appearance-materials-not-exporting-properly-when-using-fbx-cloud/td-p/10436431))

Conclusion: **materials will be re-authored downstream regardless.** For an ultra-premium dark hero we want art-directed studio materials anyway — brushed aluminium with anisotropic highlights, soft-touch polymer, glass with real thickness. Fusion's engineering appearances would be thrown away even if they exported perfectly.

**So the only thing we need from Fusion is accurate geometry.** That single constraint decides the format.

### Format scorecard

| Format | Geometry | Vertex normals | Materials | Re-tessellate later? | Verdict |
|---|---|---|---|---|---|
| **STEP** | Exact B-rep (NURBS) | N/A — generated at tessellation | None | **Yes, infinitely** | **Primary** |
| **OBJ** | Triangles, frozen | Yes (`vn`) | Default colors only | No | **Fallback** |
| FBX | Triangles, frozen | Yes | Partial, fragile | No | Avoid — see below |
| 3MF | Triangles, frozen | Weak | Per-object color | No | 3D-printing format. Poor web tooling |
| STL | Triangles, frozen | **No** — facet normals only | None | No | **Never.** Faceted shading, normals must be rebuilt |
| USDZ | Triangles + materials | Yes | Some | No | Dark horse — Blender imports USD natively. Fine for a quick look |
| IGES / SAT / SMT | B-rep | N/A | None | Yes | STEP is better supported. Skip |

### Why STEP wins

STEP is B-rep — it stores the *mathematical* surfaces, not triangles. That means **tessellation density is decided at conversion time, by us, not baked in by the designer at export time.**

This is the whole ballgame for workflow:

- Need a 200k-triangle desktop LOD and a 60k mobile LOD? Two conversions from one STEP file.
- Design review says the fillet on the handle is too coarse? Re-tessellate. **Do not go back to the designer.**
- Six months from now WebGPU lets us afford 400k? Re-tessellate.

With OBJ/FBX/STL, every LOD change is an email to the client and a re-export. With STEP, it's a command. Given eight projects, that difference compounds hard.

STEP also has no smoothing-group ambiguity: normals are computed analytically from the true surface, so cylinders and fillets shade perfectly smooth with no faceting and no guessing at an auto-smooth angle.

**Scale note:** Fusion STEP exports are in millimetres; glTF is metres. Every toolchain below applies a **0.001 scale factor**. Get this wrong and the model is 1000× too large and clips through the near plane. This is the single most common failure in this pipeline.

### Why not FBX (and why the obvious tool is a trap)

**FBX2glTF is effectively dead.** The Facebook/`facebookincubator` original is dormant; the fork Godot maintained was dropped when Godot 4.3 moved to the in-tree `ufbx` library. What remains are unmaintained community forks. Do not put an abandoned C++ binary at the centre of a pipeline that has to survive the life of this site. Combined with Fusion's fragile FBX material export, FBX has no advantage here at all.

### Pragmatic fallback: OBJ

STEP requires one extra tool (§2.1). If that proves painful on the client's machine, **OBJ at High refinement** is a perfectly good source: it carries proper vertex normals, it's triangulated, every tool reads it, and the geometry is identical to what STEP would produce at that density. The only thing lost is the ability to re-tessellate later.

**Do not accept STL.** STL has no vertex normals — only per-facet normals — so everything renders faceted until normals are rebuilt with an angle threshold in Blender, which then has to be tuned per-model. It also carries no units. It is a 3D-printing format and it should not be in this pipeline.

---

## 2. Conversion toolchain — exact Windows commands

Verified on this machine: **Node v24.19.0, npm 11.17.0**, `C:\Program Files\nodejs\node.exe`.

> **npm 11 gotcha (hit during testing):** npm 11 blocks package install scripts by default. `sharp` (texture processing, used by `gltf-transform`) needs them. If texture commands fail, run `npm approve-scripts --allow-scripts-pending` once and allow `sharp`.

### 2.0 Install the core tools

```powershell
npm install --global @gltf-transform/cli   # verified: v4.4.2
npm install --global gltfpack              # verified: works
npm install --global obj2gltf              # verified: v3.x, actively maintained by CesiumGS
```

Verify:

```powershell
gltf-transform --version
gltfpack -h
obj2gltf -h
```

### 2.1 Route A — STEP → GLB (recommended)

Two options. **`cascadio` is the lighter one** — a Python wheel wrapping OpenCASCADE that converts STEP directly to GLB with no Blender in the loop.

```powershell
# Requires Python 3.10+ (NOT currently installed on this machine — install from python.org first)
pip install cascadio    # verified current: v0.1.1, ships prebuilt Windows x64 wheels
```

```python
# step2glb.py
import cascadio
cascadio.step_to_glb("hero.step", "hero_raw.glb")
```

```powershell
python step2glb.py
```

> **Verify locally before committing to this route.** `cascadio` is young and its tessellation-tolerance keyword arguments are not documented on PyPI or in the README — the project lists richer parameters as "future work". Run `python -c "import cascadio; help(cascadio.step_to_glb)"` to see what the installed version actually accepts. If it gives no tolerance control, use Route A2, where tessellation quality is explicit and adjustable.

**Route A2 — STEP → Blender → GLB.** More setup, full control, and it's the same Blender you need for Tier A anyway.

Install Blender (not currently installed here) plus a STEP importer — either the **STEP Importer** extension from `extensions.blender.org` (OCCT-based, exposes Draft/Balanced/Fine/Ultra Fine tessellation presets plus custom linear/angular tolerance), or `import_step`, which shells out to FreeCAD.

```powershell
& "C:\Program Files\Blender Foundation\Blender 4.5\blender.exe" -b -P convert.py -- hero.step hero_raw.glb
```

```python
# convert.py  —  Blender headless STEP/OBJ -> GLB
import bpy, sys, math
argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)

if src.lower().endswith((".step", ".stp")):
    bpy.ops.import_scene.occ_import_step(filepath=src)   # operator name varies by addon — check yours
else:
    bpy.ops.wm.obj_import(filepath=src, forward_axis='Y', up_axis='Z')

for ob in bpy.context.scene.objects:
    if ob.type != 'MESH':
        continue
    ob.scale = (0.001, 0.001, 0.001)        # Fusion mm -> glTF metres. DO NOT SKIP.
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    ob.data.use_auto_smooth = True          # Blender <4.1 only; 4.1+ uses a Smooth by Angle modifier
    ob.data.auto_smooth_angle = math.radians(35)

bpy.ops.export_scene.gltf(
    filepath=dst,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_draco_mesh_compression_enable=False,  # compress in gltf-transform instead, for control
)
```

`-b` = background/headless, `-P` = run script, `--` separates Blender's args from the script's.

### 2.2 Route B — OBJ → GLB (fallback, zero extra tooling)

```powershell
obj2gltf -i hero.obj -o hero_raw.glb
```

Verified working. Then scale-correct in `gltf-transform` if the OBJ was exported in mm.

### 2.3 Optimise — the step that actually matters

Everything above produces a fat intermediate. This is where it becomes shippable.

```powershell
# Desktop LOD — full detail, meshopt
gltf-transform optimize hero_raw.glb hero.desktop.glb `
  --compress meshopt `
  --simplify false `
  --texture-compress webp `
  --texture-size 2048

# Mobile LOD — simplified
gltf-transform optimize hero_raw.glb hero.mobile.glb `
  --compress meshopt `
  --simplify true --simplify-ratio 0.3 --simplify-error 0.001 `
  --texture-compress webp `
  --texture-size 1024
```

`optimize` bundles dedup, instancing, flatten, join, weld, prune, palette, resample, simplify and compression. Verified defaults in v4.4.2: `--compress meshopt`, `--texture-compress auto`, `--texture-size 2048`, `--simplify true`.

Inspect any result:

```powershell
gltf-transform inspect hero.desktop.glb
```

`gltfpack` is the alternative and produced marginally smaller output in testing:

```powershell
gltfpack -i hero_raw.glb -o hero.desktop.glb -cc -kn -km
gltfpack -i hero_raw.glb -o hero.mobile.glb  -cc -si 0.3 -kn -km
```

`-c` = meshopt compression; `-cc` = higher-ratio variant designed to be further compressed by gzip/brotli in transit; `-si R` = simplify to ratio R; `-kn`/`-km` = keep named nodes/materials (important if the frontend targets parts by name).

---

## 3. Measured results — Draco vs meshopt

Run on this machine. Synthetic 201,600-triangle / 101,441-vertex UV sphere standing in for a Fusion "High" refinement export. `br` = brotli quality 11, i.e. realistic over-the-wire size.

| Variant | Triangles | On disk | gzip | **brotli** |
|---|---:|---:|---:|---:|
| `hero_raw.glb` (uncompressed) | 201,600 | 4741.3 KB | 1470.3 KB | 654.0 KB |
| `optimize --compress draco` | 200,883 | 218.6 KB | 166.7 KB | 163.5 KB |
| `optimize --compress meshopt` | 201,600 | 653.8 KB | 125.1 KB | **67.5 KB** |
| `gltfpack -c` | 200,880 | 718.0 KB | 297.0 KB | 254.9 KB |
| `gltfpack -cc` | 200,880 | 502.6 KB | 98.1 KB | **62.6 KB** |
| `optimize` draco + simplify 0.25 | 50,400 | 125.3 KB | 123.5 KB | 125.3 KB |
| `optimize` meshopt + simplify 0.25 | 50,400 | 195.7 KB | 149.5 KB | 138.8 KB |
| `gltfpack -cc -si 0.25` | 50,220 | 178.5 KB | 141.8 KB | 134.1 KB |
| `optimize` meshopt + simplify 0.10 | 20,160 | 20,160 → 82.3 KB | 66.1 KB | 61.5 KB |

### Three conclusions

**1. Use meshopt, not Draco — but only if you configure brotli.**

Draco looks like the winner on disk (218 KB vs 654 KB). It is not. Draco is already entropy-coded, so brotli can't improve it — it lands at 163.5 KB. Meshopt is *designed* to stay brotli-compressible and lands at **67.5 KB**, and `gltfpack -cc` at **62.6 KB**. That's **2.6× smaller over the wire.**

Meshopt also decodes faster and its decoder is a small JS blob you can inline, whereas Draco needs a separate WASM fetch on first load — which is exactly the wrong thing on the critical path when the gate is *hero interactive < 2.5s*.

> **⚠ The catch — this is a deployment task, not a build task.** `.glb` (`model/gltf-binary`) is **not** in the default compressible content-type list on Cloudflare, Netlify, or Vercel. Ship meshopt without configuring compression and you serve the 654 KB file — **worse than Draco's 218 KB.** Either add an explicit compression rule for `model/gltf-binary`, or pre-compress to `.glb.br` and serve with `Content-Encoding: br`. **Verify with DevTools that the response has `content-encoding: br` before believing any number in this table.**
>
> If compression cannot be configured on the chosen host, **switch to Draco** — 163 KB beaten only by a brotli you don't have.

**2. Simplification is not automatically a win — measure it.**

Simplifying to 50k triangles made the brotli size *worse* (138.8 KB vs 67.5 KB at full resolution). Reason: this test sphere has perfectly regular vertex ordering that meshopt predicts almost for free; simplification destroys that regularity.

Real CAD tessellation is far less regular, so simplification will help there — but the lesson stands: **these numbers are a best case for a synthetic sphere. Re-measure on the real asset before locking any LOD strategy.** Do not treat this table as a prediction for the client's actual geometry.

**3. The uncompressed intermediate is irrelevant.** 4.7 MB → 62.6 KB is a 75× reduction. Never ship, never commit, never review an unoptimised GLB.

---

## 4. Budgets

### Triangles

A single hero object is one draw call, and current guidance is consistent that **draw calls dominate triangle count** — under ~100 draw calls most devices hold 60fps. With one object we are nowhere near that limit, so we can be generous with triangles. Published 2026 mobile guidance clusters at 50k–100k triangles on screen.

| Surface | Target | Ceiling | Notes |
|---|---:|---:|---|
| Hero, desktop | 200k | 350k | One draw call. Fill rate, not geometry, is the constraint |
| Hero, mobile | 60k | 100k | Matches published mid-tier Android guidance |
| Project-page model, desktop | 120k | 200k | Below the fold — lazy load |
| Project-page model, mobile | 40k | 75k | |
| Draw calls, any page | < 20 | 50 | We should be at 1–3. If not, something is wrong |
| GPU memory, mobile | < 100 MB | 150 MB | |
| Texture memory, mobile | < 30 MB | 50 MB | |

### Over-the-wire, after meshopt + brotli

| Surface | Geometry | Textures | Total 3D | Hard stop |
|---|---:|---:|---:|---:|
| Hero, desktop | ≤ 400 KB | ≤ 1.2 MB | **≤ 1.6 MB** | 2.5 MB |
| Hero, mobile | ≤ 180 KB | ≤ 500 KB | **≤ 700 KB** | 1.2 MB |
| Project model, desktop | ≤ 300 KB | ≤ 800 KB | ≤ 1.1 MB | 1.8 MB |
| Project model, mobile | ≤ 120 KB | ≤ 350 KB | ≤ 500 KB | 900 KB |

Geometry figures assume real CAD compresses 3–6× worse than the synthetic sphere measured above. Textures dominate — **budget attention there, not on triangles.**

### Meeting *hero interactive < 2.5s on throttled 4G*

Throttled 4G is roughly 1.6 Mbps effective ≈ **200 KB/s**. A 2.5s budget shared with HTML, CSS, fonts and JS leaves perhaps **250–350 KB** for the hero.

**A real-time 3D hero does not fit.** Even the mobile LOD at 700 KB is ~3.5s of transfer before a single frame renders, before WASM decode, before shader compile.

This is an independent argument for Tier A: the G-buffer hero's *first paint* is a single ~120 KB WebP. The normal and ORM maps stream in behind it and the relight shader activates when they land. **The hero is visually complete in under a second and becomes interactive when it can.** Real-time 3D cannot degrade this way — it's all-or-nothing.

---

## 5. Tier A — G-buffer relighting (the hero)

### Passes to render from Blender/Cycles

Locked camera. Long lens (85–135mm equivalent) for the museum-vitrine compression. Render once, at 2× the largest display size.

| Pass | Cycles source | Format | Channels | ~Size |
|---|---|---|---|---:|
| Albedo + matte | Diffuse Color pass | WebP q92 | RGB + **A** | ~180 KB |
| Normal | Normal pass (camera space) | WebP q95 or PNG | RGB | ~400 KB |
| ORM | AO / Roughness / Metallic packed | WebP q90 | R/G/B | ~120 KB |
| Depth | Mist pass | packed into ORM alpha | A | — |

**Total ≈ 700 KB**, and the albedo alone is a complete, beautiful static hero.

Normals are the compression-sensitive pass — lossy artifacts show up as visible blotches once lit. Start at WebP q95, inspect the *lit* result, fall back to PNG if banding appears.

The **alpha channel of the albedo is the occlusion mask.** Layer: `<h1>` type → G-buffer canvas → background. The object occludes the type for free, with anti-aliased edges, exactly as the direction requires.

### The shader

One fullscreen quad. Sample the four maps, reconstruct a view-space position from depth, run Blinn-Phong or GGX against a light position fed from the cursor, composite over the albedo. Roughly 60 lines of GLSL.

The lag is a critical-damped spring on the light's uv position, stepped in a rAF loop — **not** a CSS transition:

```js
lightPos.x += (targetX - lightPos.x) * 0.045;  // low k = heavy, expensive
lightPos.y += (targetY - lightPos.y) * 0.045;
```

Low stiffness is what reads as "heavy and expensive". Tune between 0.03 and 0.07. Anything above ~0.15 starts to feel snappy and toy-like.

Per project, drive the light's **colour** from that project's accent while keeping the object's albedo neutral — eight distinct moods from one render. This is a direct, cheap win for the eight-accent system.

### `prefers-reduced-motion`

Disable the rAF loop; pin the light to a flattering fixed position; render one frame. The hero stays fully lit and beautiful, just static. **Gate the animation on `no-preference` rather than adding it and overriding** — cleaner, and it means the static state is the well-tested default.

---

## 6. Tier C — scroll-scrubbed image sequence

For 1D reveals inside case studies: turntables, exploded assemblies, before/after. Not the hero (§0).

### When it beats WebGL

- Materials that are genuinely hard in real time — thin-film iridescence, real refraction, complex SSS
- Frame cost must be *guaranteed* (it's a `drawImage`, nothing else)
- Geometry is messy or CAD is still changing
- The visual is a fixed narrative, not something the visitor controls

### When it loses

- Free-form user control (2D input, orbit) — impossible
- Payload matters more than fidelity — **a sequence is usually heavier than the equivalent GLB**
- Content changes often — every edit is a full re-render and re-encode

### Specification

| | Desktop | Mobile |
|---|---|---|
| Frames | 90–120 | 45–60 |
| Resolution | 1600 × 900 | 750 × 900 |
| Format | AVIF, WebP fallback | AVIF |
| Per frame | 30–45 KB | 12–20 KB |
| **Total** | **3.5–5 MB** | **0.9–1.2 MB** |

Below ~60 frames scrubbing visibly steps. Above ~140 you're paying for frames nobody resolves. **120 is the sweet spot; 90 is usually indistinguishable.** Prefer AVIF — significantly smaller than WebP at these sizes — with WebP fallback via `<picture>`-style capability detection.

### Implementation

The rule: **decode ahead of time, never in the scroll handler.** Image decode is the expensive operation and scroll runs on the main thread.

```js
// Decode once, up front, into ImageBitmaps. Never decode during scroll.
const frames = await Promise.all(
  urls.map(u => fetch(u).then(r => r.blob()).then(createImageBitmap))
);

const ctx = canvas.getContext('2d', { alpha: false });
let current = -1;

function draw(i) {
  if (i === current) return;        // skip redundant draws
  current = i;
  ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
}

ScrollTrigger.create({
  trigger: section,
  pin: true,
  scrub: 1,                          // matches the Lenis-smoothed feel
  onUpdate: (self) => draw(Math.round(self.progress * (frames.length - 1))),
});
```

- `createImageBitmap` gives GPU-ready decoded frames — `drawImage` becomes a blit
- `{ alpha: false }` is a meaningful win on an opaque canvas
- The `i === current` guard eliminates most redundant draws
- Load the **first frame first**, paint it, then stream the rest; show the poster until ready
- 120 × 1600 × 900 × 4 bytes ≈ **690 MB** of `ImageBitmap` memory if fully decoded — **too much.** Decode in a sliding window (±20 frames) or drop resolution. On mobile, hold the window to ±10.
- `prefers-reduced-motion`: skip the sequence entirely, render a single hero frame, unpin the section

---

## 7. Recommended plan

1. **Build the hero as Tier A.** It serves the locked direction better than real-time 3D, it's the only option that meets the 2.5s gate, and it's immune to whatever state the CAD arrives in.
2. **Placeholder now.** Until real assets land, the hero runs on G-buffers rendered from clearly-labelled primitive geometry. The shader, the spring, the occlusion layering and the accent-colour system are all built and tuned against placeholders — none of that work is thrown away when real renders arrive.
3. **Revisit Tier B when geometry exists.** If a project page genuinely wants an inspectable model, §1–§4 is ready. Measure the real asset before committing to LODs.
4. **Deployment task, do not forget:** configure brotli for `model/gltf-binary` if any GLB ships. Confirm in DevTools.

---

## 8. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `.glb` served uncompressed | meshopt is 3× *worse* than Draco | Configure host compression; verify in DevTools; else switch to Draco |
| Fusion mm → glTF m scale error | Model 1000× too large, clips near plane | 0.001 factor in every route; assert bbox ≈ 0.1–0.5m after conversion |
| Client exports STL | Faceted shading, no normals, no units | Reject. STEP or OBJ only |
| `cascadio` tessellation params undocumented | No LOD control on Route A | Verify `help()` locally; Route A2 (Blender) as backup |
| Real CAD compresses far worse than the test sphere | Budgets blown | §3 numbers are a synthetic best case — re-measure on the first real asset |
| ImageBitmap memory on mobile (Tier C) | Tab crash | Sliding-window decode; ±10 frames on mobile |
| Normal-map compression artifacts (Tier A) | Blotchy lighting | Inspect the *lit* result, not the map; PNG fallback |
| Blender not installed; Python not installed | Blocks Routes A/A2 and Tier A | Install Blender 4.5 LTS + Python 3.12 before asset work starts |

---

## Appendix — reproducing the §3 measurements

```powershell
mkdir pipetest; cd pipetest
npm init -y
npm install @gltf-transform/cli obj2gltf gltfpack draco3dgltf meshoptimizer
$env:PATH = "C:\Program Files\nodejs;$PWD\node_modules\.bin;$env:PATH"

# generate a ~200k-tri sphere as hero.obj, then:
obj2gltf -i hero.obj -o hero_raw.glb
gltf-transform optimize hero_raw.glb out_meshopt.glb --compress meshopt --simplify false
gltf-transform optimize hero_raw.glb out_draco.glb   --compress draco   --simplify false
gltfpack -i hero_raw.glb -o pack_cc.glb -cc
```

Then brotli each output at quality 11 (`zlib.brotliCompressSync`) — **the on-disk size is not the number that matters.**

## Sources

- [glTF Transform CLI](https://gltf-transform.dev/cli) · [CLI source, verified flags](https://github.com/donmccurdy/glTF-Transform)
- [gltfpack / meshoptimizer](https://meshoptimizer.org/gltf/)
- [obj2gltf (CesiumGS)](https://github.com/CesiumGS/obj2gltf) · [cascadio (trimesh)](https://github.com/trimesh/cascadio)
- [FBX2glTF — dormant upstream](https://github.com/facebookincubator/FBX2glTF) · [Godot fork, superseded by ufbx](https://github.com/godotengine/FBX2glTF)
- [Fusion: appearances lost in STEP/IGES](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Appearances-and-physical-materials-are-lost-when-exporting-as-Step-or-IGS-from-Fusion-360.html) · [Fusion: OBJ/MTL limits](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Can-Fusion-export-bmeshes-with-an-mtl-file.html) · [Fusion: FBX material issues](https://forums.autodesk.com/t5/fusion-support-forum/appearance-materials-not-exporting-properly-when-using-fbx-cloud/td-p/10436431)
- [Fusion mesh export refinement](https://www.autodesk.com/products/fusion-360/blog/how-to-export-autodesk-fusion-model-for-3d-printing/) · [STEP Importer for Blender](https://extensions.blender.org/add-ons/step-importer/)
- [Three.js performance guidance 2026](https://www.utsubo.com/blog/threejs-best-practices-100-tips) · [Draw calls](https://threejsroadmap.com/blog/draw-calls-the-silent-killer)
- [Cloudflare content compression](https://developers.cloudflare.com/speed/optimization/content/compression/) · [Netlify compressible types](https://answers.netlify.com/t/configure-additional-file-formats-for-gzip-brotli-compression/112629)
- [Apple-style scroll sequences](https://css-tricks.com/lets-make-one-of-those-fancy-scrolling-animations-used-on-apple-product-pages/) · [Respecting motion preferences](https://www.smashingmagazine.com/2021/10/respecting-users-motion-preferences/)
