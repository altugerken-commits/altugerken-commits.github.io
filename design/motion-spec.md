# THE VITRINE — Hero Motion & Interaction Specification

Owner: motion & interaction director
Status: implementation-ready (v1)
Target: `src/components/hero/` + `src/scripts/hero.ts`
Stack: Astro 7, Tailwind 4, GSAP 3 + ScrollTrigger, Lenis. **No Three.js in v1** (see §A.5).

---

## 0. Invariants

These are not negotiable by the implementation. If a technique here conflicts with one of these, the technique loses.

| # | Invariant |
|---|---|
| I1 | 60fps sustained during the hero intro, the dwell loop, and the scroll handoff, on a Moto-G-class Android. |
| I2 | Hero *interactive* (light responds to pointer) by 2.5s on Fast 4G + 4x CPU throttle. |
| I3 | Only `transform` and `opacity` are animated per-frame. Everything else is a static value or a pre-baked raster. |
| I4 | Zero JS failure mode: with JS disabled or broken, the hero renders at its **final** state, fully legible. Nothing starts at `opacity: 0` unless JS has confirmed it will run. |
| I5 | The object never rotates, never tilts, never tracks the cursor. **The light moves. The object does not.** |
| I6 | No pure `#000`, no pure `#FFF`. Base is blue-black. Grain layer is always present to kill banding. |
| I7 | The occlusion technique must accept an arbitrary future object silhouette from the CMS with zero manual tracing. |

### Motion vocabulary (so 8 projects feel like one site)

| Token | Value | Used for |
|---|---|---|
| `--ease-settle` | `expo.out` — CSS `cubic-bezier(0.16, 1, 0.30, 1)` | anything arriving at rest (type mask-in, object landing) |
| `--ease-glide` | `power2.inOut` — CSS `cubic-bezier(0.45, 0, 0.20, 1)` | light sweeps, cross-fades, anything that starts and ends moving |
| `--ease-breath` | `sine.inOut` | idle loops only |
| `--ease-exit` | `power2.in` | anything leaving toward the camera |
| `--d-fast` | 0.32s | HUD elements, mono labels |
| `--d-base` | 0.80s | secondary reveals |
| `--d-settle` | 1.40s | display type, object |
| `--d-sweep` | 1.60s | keylight travel |

Rule: nothing in this site uses `back`, `elastic`, or `bounce`. Ever. Overshoot reads as toy-like and it is explicitly against the direction.

---

## 1. The layer stack

Everything below assumes this exact z-order inside `.hero__stage`. The stage has `isolation: isolate` so blend modes cannot escape into the page root.

| z | Layer | Element | Blend | Promoted? |
|---|---|---|---|---|
| 0 | Void ground | `.hero__void` — radial `oklch` gradient, blue-black | normal | no |
| 5 | Floor glow | `.hero__hairline` — the beat-0 shutter, grown into ambient floor light | normal | yes (`transform`) |
| 10 | **DISPLAY TYPE (behind)** | `.hero__headline` | normal | yes (`transform` on wrapper) |
| 20 | Contact shadow | `.hero__contact` — pre-blurred radial PNG | normal | yes |
| 30 | **OBJECT FRONT PLATE** | `.hero__object img` — alpha AVIF/WebP | normal | yes |
| 35 | Keylight specular | `.hero__spec` — gradient sprite, masked to object alpha | `plus-lighter` | yes |
| 40 | *(optional)* front type band | `.hero__headline--front` | normal | only if used |
| 50 | HUD — mono spec block, bracket markers, eyebrow, nav | normal | no |
| 60 | Film grain | `.hero__grain` — 128px tiled PNG | `overlay` @ 0.045 | yes |
| 70 | Cold-start overlay | `.hero__cold` — removed from DOM after beat 0 | normal | no |

Total promoted layers: **7**. That is the budget. Do not add an eighth without removing one.

---

## 2. Beat choreography

The whole intro is one master `gsap.timeline({ paused: true })` built inside `gsap.matchMedia()`. Beat 2 is a set of independent infinite timelines started by the master's `onComplete`. Beat 3 is a separate ScrollTrigger.

### Beat 0 — COLD START (the shutter)

**Trigger:** first paint. CSS-only — this must not wait for the JS bundle.

The hairline is a `<div>` with a CSS `@keyframes` animation declared in the critical inline stylesheet. GSAP never touches it during beat 0. The only JS involved is a 6-line `is:inline` script in `<head>` that sets `data-motion` (see §C.2).

| Track | Property | From → To | Duration | Ease | Start |
|---|---|---|---|---|---|
| Hairline draw | `transform: scaleX()` | `0 → 1` (origin `50% 50%`) | **820ms** | `cubic-bezier(0.16, 1, 0.30, 1)` | 0ms |
| Hairline luminance | `opacity` | `0 → 1` | 180ms | `linear` | 0ms |
| Hairline settle | `opacity` | `1 → 0.34` | 400ms | `cubic-bezier(0.45,0,0.20,1)` | 620ms |
| Hairline → floor glow | `transform: scaleY()` | `1 → 46` (origin `50% 100%`) | 900ms | `cubic-bezier(0.45,0,0.20,1)` | 700ms |

The hairline is `height: 1px`, `width: 100%`, positioned at `top: 62%` (where the object's floor contact will be). It draws from the centre outward, dims, then stretches vertically into the ambient floor wash that stays on screen for the rest of the hero. **The shutter becomes the room light.** Same element, no DOM churn.

`scaleY(46)` on a 1px element is a compositor-only operation on an already-rasterised gradient — free. Do not use `height` or `box-shadow` for this.

**Preload gate.** Beat 1 starts when:

```js
const ready = Promise.all([
  document.fonts.ready,                 // subset display serif + mono
  heroSharpImg.decode().catch(() => {}) // never let a decode failure hang the page
]);
const floor   = new Promise(r => setTimeout(r, 800));   // let the shutter finish
const ceiling = new Promise(r => setTimeout(r, 1400));  // LCP protection

await Promise.all([floor, Promise.race([ready, ceiling])]);
```

Floor 800ms so the gesture always completes. Ceiling **1400ms**, hard. If the ceiling trips, beat 1 runs against the LQIP and the sharp plate cross-fades in whenever it lands. This is the LCP escape hatch — if field data fails the 2.5s gate, drop the ceiling to 900ms and the floor to 600ms before touching anything else.

The `font-display: block` window (max 3s in Chrome, but we cap the visible cost) is deliberately hidden inside beat 0. The user never sees FOIT because there is nothing to see yet.

---

### Beat 1 — MATERIALIZE

**Trigger:** beat-0 promise resolves. `masterTl.play()`.
**Total length:** 2.15s. **Pointer listener is attached at t=0 of this beat** — that is the interactive moment for I2.

Positions below are absolute seconds on the master timeline.

| t | Track | Target | Property | From → To | Dur | Ease | Stagger |
|---|---|---|---|---|---|---|---|
| 0.00 | Object rise | `.hero__object` | `y` | `18px → 0` | 1.80 | `expo.out` | — |
| 0.00 | Object settle | `.hero__object` | `scale` | `1.035 → 1` | 1.80 | `expo.out` | — |
| 0.00 | Object presence | `.hero__object` | `autoAlpha` | `0 → 1` | 1.20 | `power2.out` | — |
| 0.15 | Sharpen | `.hero__object img.sharp` | `opacity` | `0 → 1` | 1.10 | `power1.inOut` | — |
| 0.15 | LQIP retire | `.hero__object img.lqip` | `opacity` | `1 → 0` | 1.10 | `power1.inOut` | — |
| 0.10 | Keylight sweep X | `.hero__spec` (+ `.hero__key`) | `x` | `-0.38 → 0.00` (norm.) | 1.60 | `power2.inOut` | — |
| 0.10 | Keylight sweep Y | same | `y` | `-0.22 → 0.00` (norm.) | 1.60 | `power2.inOut` | — |
| 0.10 | Keylight bloom | same | `scale` | `0.74 → 1` | 1.60 | `power2.inOut` | — |
| 0.10 | Contact spread | `.hero__contact` | `scaleX` | `0.58 → 1` | 1.60 | `expo.out` | — |
| 0.10 | Contact weight | `.hero__contact` | `opacity` | `0 → 0.55` | 1.20 | `power2.out` | — |
| **0.45** | **Headline mask-in** | `.line__inner` | `yPercent` | `118 → 0` | **1.40** | **`expo.out`** | **0.10 each** |
| 0.45 | Headline presence | `.line__inner` | `opacity` | `0 → 1` | 0.80 | `power1.out` | 0.10 each |
| 1.15 | Eyebrow `( 001 · VITRINE )` | `.hero__eyebrow` | `clipPath` inset | `inset(0 100% 0 0) → inset(0 0% 0 0)` | 0.62 | `power2.inOut` | — |
| 1.30 | Bracket markers | `.bracket path` | `strokeDashoffset` | `len → 0` | 0.70 | `power2.inOut` | 0.05 each |
| 1.30 | Spec block rows | `.spec__row` | `y` / `opacity` | `8px → 0` / `0 → 0.62` | 0.50 | `power2.out` | 0.06 each |
| 1.55 | Scroll cue | `.hero__cue` | `opacity` | `0 → 0.40` | 0.60 | `power2.out` | — |

**`yPercent: 118`, not 100.** A high-contrast display serif has descenders and the mask box is set to cap-height + leading. At 100 the descenders of `g`, `y`, `j` peek below the mask edge on the first frame. 118 clears them with margin. Verify per-line against the actual PP Editorial New metrics and raise if needed.

**Mask structure** (required for the mask-in to work at all):

```html
<h1 class="hero__headline">
  <span class="line"><span class="line__inner">I turn constraints</span></span>
  <span class="line"><span class="line__inner">into objects.</span></span>
</h1>
```
`.line { display:block; overflow:hidden; }` — `overflow: hidden` on a block, not `clip-path`. `.line__inner { display:block; will-change: transform; }`.

Do **not** use SplitText per-character here. Per-line only. Per-character on a 120px display serif means 30+ promoted layers and it looks like a 2019 template. Per-line reads as editorial.

**Why 0.45s of overlap.** The object begins resolving out of the void before the type arrives, so the type appears to be revealed *by* the light rather than alongside it. Starting them together reads as a slideshow.

**Sequencing note for occlusion:** the headline sits at z=10, behind the object at z=30. During the mask-in, the portion of each line that will be occluded is already hidden by the object plate — the line appears to slide up *out from behind* the object. This is free and it is the single best frame in the whole intro. Position the object so it crosses the type's baseline band (see §A.6).

**Cleanup on complete:** `gsap.set('.line__inner, .hero__contact', { willChange: 'auto' })`. Keep `will-change` only on `.hero__object`, `.hero__spec`, `.hero__grain` — those keep animating.

---

### Beat 2 — DWELL

**Trigger:** `masterTl.onComplete`. Three independent infinite timelines plus the pointer loop.

#### Breathing (must be imperceptible)

| Track | Property | Amplitude | Period | Ease | Repeat |
|---|---|---|---|---|---|
| Object float | `y` | `0 → -3px` | **7.2s** | `sine.inOut` | `-1`, `yoyo: true` |
| Object swell | `scale` | `1 → 1.004` | **9.1s** | `sine.inOut` | `-1`, `yoyo: true` |
| Key intensity | `.hero__key` `opacity` | `0.88 → 1.00` | **11.3s** | `sine.inOut` | `-1`, `yoyo: true` |
| Contact response | `.hero__contact` `scaleX`/`opacity` | `1 → 0.965` / `0.55 → 0.50` | **7.2s**, `delay: 0.18` | `sine.inOut` | `-1`, `yoyo: true` |

The three periods are deliberately non-commensurate (7.2 : 9.1 : 11.3). Equal or integer-ratio periods phase-lock and produce a visible pulse — the exact thing we are trying to avoid. The contact shadow lags the float by 180ms so weight reads as transferring.

`-3px` is the ceiling. At `-6px` a 720px object visibly bobs and the vitrine becomes a screensaver.

#### Grain

Static 128×128 PNG tile (feTurbulence baked at build time, ~4kB), layer sized `calc(100% + 128px)`, animated by `transform: translate3d()` between 8 pre-set offsets:

```css
@keyframes grain-shift {
  0%,12.5%   { transform: translate3d(0,0,0) }
  12.5%,25%  { transform: translate3d(-14px,7px,0) }
  /* … 8 steps total … */
}
.hero__grain { animation: grain-shift 640ms steps(1, end) infinite; }
```

80ms per step = 12.5fps. Never animate `background-position` (paint) and never generate grain in canvas (main thread). Composited translate only.

#### HUD

Static. One exception: a mono caret in the spec block, `opacity` `1 → 0` at `steps(1)` on a 1.06s loop. One element, one property.

#### Pointer light — see §B.

---

### Beat 3 — HANDOFF

**No ScrollTrigger `pin`.** Use native `position: sticky`. Pinning promotes to `position: fixed`, requires `pinSpacing` math, fights Lenis on refresh, and adds a resize-storm failure mode on mobile. Sticky gives the same dwell for free with no layout involvement.

```
.hero            { position: relative; height: 180svh; }
.hero__stage     { position: sticky; top: 0; height: 100svh; }
.hero__stage > * { /* will-change lives HERE, never on the sticky element itself */ }
```

`will-change: transform` on a `position: sticky` element establishes a containing block and breaks stickiness in Chromium. Put it on children only.

**ScrollTrigger:**

```js
ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: '+=80%',           // dolly completes at 80svh of scroll; 100svh of runway remains
  scrub: 0.8,             // number, not `true` — see §E.8
  invalidateOnRefresh: true,
  animation: handoffTl
});
```

`handoffTl` is a paused timeline with a total duration of 1 (unitless — scrub maps progress 0→1 onto it).

| Progress | Track | Property | From → To | Ease |
|---|---|---|---|---|
| 0.00 → 1.00 | Object dolly | `scale` | `1 → 2.05` | `power2.in` |
| 0.00 → 1.00 | Object drift | `y` | `0 → -7svh` | `none` |
| 0.22 → 0.70 | Object dissolve | `opacity` | `1 → 0` | `power1.in` |
| 0.00 → 1.00 | Type dolly | `.hero__headline` `scale` | `1 → 1.28` | `power2.in` |
| 0.00 → 1.00 | Type drift | `.hero__headline` `y` | `0 → -3svh` | `none` |
| 0.40 → 0.80 | Type dissolve | `.hero__headline` `opacity` | `1 → 0` | `power1.in` |
| 0.00 → 0.55 | Keylight collapse | `.hero__spec` `scale` / `opacity` | `1 → 1.6` / `1 → 0` | `power2.in` |
| 0.05 → 0.45 | HUD retire | `.hero__hud` `opacity` / `y` | `1 → 0` / `0 → -12px` | `power2.in` |
| 0.10 → 0.62 | Contact release | `.hero__contact` `opacity`/`scaleX` | `0.55 → 0` / `1 → 1.4` | `power2.in` |
| 0.40 → 0.95 | Floor glow lift | `.hero__hairline` `scaleY`/`opacity` | `46 → 120` / `0.34 → 0` | `power2.inOut` |

**Depth logic — get this right or the dolly reads backwards.** The type is *behind* the object; the camera is moving forward; therefore the camera reaches the **object first**. Two consequences, both mandatory:

- **The nearer thing scales faster.** Object `1 → 2.05`, type `1 → 1.28`. That ratio *is* the parallax. Equal scale rates collapse the depth and it reads as a flat image being zoomed.
- **The nearer thing leaves first.** Object dissolve `0.22 → 0.70`; type dissolve `0.40 → 0.80`. The object passes the camera and is gone while the type is still receding. Inverting this ordering is the single most common way this shot goes wrong — it reads as the type being in *front*, which contradicts the entire occlusion device established in beat 1.

The type's dissolve window (0.40–0.80) deliberately overlaps the project-01 title's rise (0.42–1.00). That shared stretch of progress *is* the seamless handoff: one serif headline is receding while the next arrives, and the screen is never empty. Do not close that gap.

**The rising project title** lives in the next section, not in the hero, and gets its own ScrollTrigger on the same scroll range:

```js
ScrollTrigger.create({
  trigger: '.hero',
  start: 'top top',
  end: '+=80%',
  scrub: 0.8,
  animation: gsap.timeline()
    .fromTo('.project-01__title .line__inner',
      { yPercent: 118 },
      { yPercent: 0, ease: 'none', stagger: 0.08 }, 0.42)
    .fromTo('.project-01__meta',
      { opacity: 0 }, { opacity: 0.62, ease: 'none' }, 0.68)
});
```

Because the hero stage is sticky and the project section scrolls up underneath it, the title is already at rest by the time the stage unsticks. **No visible section boundary** requires three things, all of them mandatory:

1. `.project-01` background is the identical `--void` gradient, no rule, no border, no change in grain density.
2. `.project-01` has `margin-top: -20svh` so it slides under the tail of the hero runway.
3. The grain layer is `position: fixed` at the document level, not per-section, so grain does not re-tile at the seam.

---

## 3. §A — OCCLUSION

**The requirement:** the display serif passes *behind* the object and is occluded by it, with pixel-correct edges, for **8 different objects now and an unknown number later**, delivered by a client whose CAD exports no glb/gltf.

### A.1 Candidates

| # | Technique | Fidelity | Build cost | Runtime cost | Survives unknown silhouette? |
|---|---|---|---|---|---|
| 1 | **Alpha-cutout plate, paint order** — object exported as straight-alpha AVIF/WebP, `z-index` above the type | **Perfect** (alpha is authored by the renderer: soft edges, DOF, glass, motion blur all correct) | One export per object | One composited texture. Zero. | **Yes, zero human work** |
| 2 | CSS `mask-image` + alpha matte on the type layer | Perfect *in theory*; in practice 1px halos and misregistration because the matte and the object image resample independently across breakpoints | Two exports per object + registration QA | Masked layer breaks the fast compositing path; measurably slow on Mali/Adreno | Yes, but doubles the asset contract |
| 3 | SVG `clipPath` | **Poor.** 1-bit edges. Destroys soft alpha — a glass or brushed-aluminium edge becomes a cookie-cutter | **Very high** — someone traces a path per object, forever | Cheap | **No.** Disqualifying. |
| 4 | WebGL depth sort (type as texture, or DOM sandwiched between two canvas passes) | Perfect, and *dynamic* — type can genuinely intersect geometry | **Extreme.** Fusion 360 exports no glb/gltf → STEP/OBJ → Blender → decimate → Draco/Meshopt, per object, by hand. DOM-between-two-canvases needs two contexts or manual RT compositing with correct blending | Three.js tree-shaken ≈ 45kB br + ~30kB wasm decoder + real-time lighting on a mid-tier Android | Yes, but only after a manual 3D pipeline per object |
| 5 | CSS 3D `preserve-3d` + `translateZ` | **Not an occlusion technique.** An image plane still occludes as a rectangle unless it has alpha — at which point it *is* technique 1. What it actually provides is free depth parallax and perspective scale | Low | Cheap, but a `preserve-3d` subtree cannot be flattened and can force extra layers | n/a |
| 6 | Duplicate type + rectangular clip band on the front copy | Adequate *supplement* only | Low | Cheap | Partially — the band is per-object art direction |

### A.2 Recommendation

**Technique 1 (alpha-cutout plate, paint order), composed with technique 5 for depth parallax, with technique 6 held in reserve.**

Justification, in order of weight:

1. **It is the only option whose occlusion data is produced by the renderer itself.** The alpha channel of a render *is* the silhouette — including antialiasing, depth-of-field falloff, and semi-transparent glass. Every other technique derives an approximation of it and then has to keep that approximation registered against the image. Derivation is where the halos come from.
2. **It satisfies I7 with a one-line CMS contract:** *"upload a cutout with a transparent background."* Nothing else in the list can be handed to a non-technical client for object #9.
3. **Paint order is the most reliable primitive on the web platform.** No mask compositing path, no `clipPath` reference resolution, no WebGL context loss, no `preserve-3d` flattening bugs. It works in every browser that has ever shipped.
4. **It costs one asset and zero runtime.** The plate is an ordinary composited texture; the GPU treats it identically to any other image.
5. **It degrades perfectly.** Reduced motion, JS off, print — the occlusion still happens, because it is just z-order.

Technique 5 is layered on top for depth, not occlusion: put `.hero__headline` at `translateZ(-140px)` and `.hero__object` at `translateZ(0)` inside a `perspective: 1400px; transform-style: preserve-3d` stage. This buys correct parallax during the beat-3 dolly for free — the browser scales the further plane less. Keep the subtree shallow (3 children) so flattening cost stays bounded.

Technique 2 is **not** rejected outright — it is redeployed. The alpha plate doubles as a mask *source* for the specular layer (§B.4), which is exactly where mask-image earns its cost: one small element, one static mask, never animated.

### A.3 Asset contract (hand this to whoever renders the objects)

Per project, delivered into `src/assets/objects/<slug>/`:

| File | Spec |
|---|---|
| `plate.avif` | The object, **straight alpha**, transparent background. Max 1440px on the long edge. AVIF q58–62 with alpha. Budget **≤ 180kB**. |
| `plate.webp` | Same image, WebP alpha, for the `<picture>` fallback. |
| `lqip.avif` | 32px long edge, blurred at encode, base64-inlined into the HTML. |
| `contact.png` | Pre-blurred contact shadow, greyscale on transparent, ~400×160. Blurred **at export**, never with a runtime `filter`. |
| `meta.json` | `{ "accent": "oklch(…)", "offsetX": 0.0, "offsetY": 0.0, "scale": 1.0, "occlusionBand": [0.38, 0.72] }` |

**Critical render instruction — edge fringing.** Rendering the object on a white or neutral-transparent background produces light-coloured edge pixels that glow against a blue-black ground and read as a cheap cutout. Set the render environment / world colour to the hero base (`oklch(0.16 0.035 258)`) before keying, so partially-covered edge pixels blend *toward* blue-black. Then export straight alpha. This one instruction is the difference between "museum vitrine" and "clip art".

**Colour management:** export sRGB, not Display P3. A P3 plate against an sRGB-authored gradient produces a visible ground/object hue mismatch on wide-gamut displays.

### A.4 CMS contract

`meta.json` gives the art director per-object placement (`offsetX/offsetY/scale`) without a code change. The `occlusionBand` pair defines, in normalised type-block coordinates, which vertical slice of the headline the object is allowed to cover. Enforced as an authoring rule, not code:

- The object may not occlude the **first or last glyph** of any line.
- Total occluded area of the headline ≤ **30%**.
- No more than **two consecutive** glyphs may be fully hidden.

Gestalt closure does the rest — the word stays readable, and the occlusion reads as depth rather than damage. Without these rules, object #6 will land on the word "objects" and eat it.

### A.5 Why not WebGL (and the trigger to revisit)

WebGL is the *right* answer to occlusion in the abstract and the wrong answer here, because of a supply-chain fact: **Fusion 360 exports f3d, 3mf, ipt/iam, dwg, dxf, FBX, iges, OBJ, sat, skp, smt, STEP, STL, USDZ — and no glb/gltf.** Every object therefore requires a manual STEP/OBJ → Blender → decimate → Draco/Meshopt conversion, plus material re-authoring, plus per-object LODs, before it can be depth-sorted. Multiply by 8, then by every future project. Against that, technique 1 needs one render export the client already produces.

Add to that: ~45kB brotli for a tree-shaken Three.js, ~30kB for the decoder wasm, real-time lighting on a mid-tier Android, and shadow maps (the single biggest mobile frame-rate killer) — against I1 and I2 it does not close.

**Revisit only if all three become true:** (a) real 3D assets are delivered as production-ready GLB by someone other than us, (b) the interaction requires the type to genuinely *intersect* the geometry rather than pass behind it, (c) a measured build hits 60fps on the reference Android. Until then, USDZ is worth keeping for an iOS AR "view in your space" link — that is a separate, non-blocking feature.

### A.6 Composition rule

Place the object so its silhouette crosses the **x-height band of the headline's second line**. Crossing the cap-height band hides too little to read as depth; crossing below the baseline hides nothing. The x-height band is where occlusion is unmistakable and legibility survives.

---

## 4. §B — LIGHT FOLLOWS CURSOR, WITH LAG

### B.1 Heavy vs laggy — the actual distinction

They are two different quantities and conflating them is why most implementations of this feel broken:

- **Onset latency** — time between the pointer moving and *any* response beginning. Must be **≤ 1 frame (16.7ms)**. Nonzero onset latency is what the hand reads as "laggy" / "broken input".
- **Settling time** — time for the response to arrive at its destination. Can be **as long as we like**. Long settling with zero onset is what the eye reads as "mass", "inertia", "expensive".

Exponential smoothing has *zero onset latency by construction*: the response begins on the same frame, at a rate proportional to distance. So the recipe is: **never delay the response, only slow it.**

The three things that inject onset latency and must be forbidden:

1. **Throttling / debouncing `pointermove`.** The handler must do nothing but store the raw coordinate.
2. **Dead zones.** A "don't move until the pointer has moved N px" threshold is literally an onset delay.
3. **`gsap.quickTo` / duration-based tweens per pointer event.** Each event restarts a tween; the ease re-runs from zero, producing a rubber-band with a soft start. That soft start *is* onset latency. Use `quickSetter` + your own integrator instead.

### B.2 The integrator (frame-rate independent — this is the important part)

The naive version is wrong:

```js
cur += (target - cur) * 0.06;   // WRONG — feel changes with refresh rate
```

At 144Hz this converges 2.4× faster than at 60Hz. The user's monitor changes the art direction. Use exponential decay with real time:

```js
// lambda in 1/seconds. dt in seconds.
const alpha = 1 - Math.exp(-LAMBDA * dt);
cur += (target - cur) * alpha;
```

Conversion from a legacy per-frame factor `k` quoted at 60fps: `LAMBDA = -60 * Math.log(1 - k)`.

### B.3 Tuning table

| λ | τ = 1/λ | 95% settle (3τ) | k @60fps | Reads as |
|---|---|---|---|---|
| 1.5 | 667ms | 2.0s | 0.025 | Detached. Broken. |
| 2.2 | 455ms | 1.36s | 0.036 | Very heavy — **use for the ambient wash** |
| **4.0** | **250ms** | **750ms** | **0.065** | **Heavy, cinematic — DEFAULT for the key** |
| 7.0 | 143ms | 429ms | 0.110 | Alive — **use for the specular hotspot** |
| 12 | 83ms | 250ms | 0.181 | Responsive UI |
| 30+ | 33ms | 100ms | 0.394 | Effectively 1:1. Cheap. |

**Ship three masses, not one.** This is the detail that makes it read as expensive rather than as a gradient following the mouse:

| Layer | λ | Travel amplitude | Notes |
|---|---|---|---|
| `.hero__key` — broad ambient wash | **2.2** | 0.46 | The room responding |
| `.hero__spec` — specular hotspot on the object | **7.0** | 0.62 | The highlight |
| `.hero__contact` — cast shadow | **3.4** | −0.35 (inverted) | Opposes the light |

Three different time constants produce parallax *within the lighting*. One shared λ produces a sticker.

### B.4 CSS / image path — implementation

**The single most important perf rule here: do not animate the gradient. Animate a transform on a static gradient.**

```css
@property --light-i { syntax: '<number>'; initial-value: 1; inherits: false; }

.hero__key,
.hero__spec {
  position: absolute; inset: -30%;
  pointer-events: none;
  will-change: transform;
  transform: translate3d(var(--lx, 0px), var(--ly, 0px), 0) scale(var(--ls, 1));
}

.hero__key {
  background: radial-gradient(circle at 50% 50%,
    color-mix(in oklab, var(--accent) 30%, white) 0%,
    color-mix(in oklab, var(--accent) 55%, transparent) 32%,
    transparent 68%);
  opacity: calc(0.42 * var(--light-i));
  mix-blend-mode: plus-lighter;
}

.hero__spec {
  background: radial-gradient(circle at 50% 50%,
    oklch(0.98 0.02 258 / 0.9) 0%,
    oklch(0.86 0.06 258 / 0.35) 18%,
    transparent 46%);
  /* the object's own alpha plate confines the highlight to the object */
  mask-image: url('/assets/objects/<slug>/plate.avif');
  mask-size: contain; mask-position: center; mask-repeat: no-repeat;
  mix-blend-mode: plus-lighter;
}

@supports not (mix-blend-mode: plus-lighter) {
  .hero__key, .hero__spec { mix-blend-mode: screen; }
}
```

Note: `.hero__spec`'s mask is **static** — the mask never animates; the gradient inside the masked box translates. That keeps the mask raster cached.

`plus-lighter` is physically correct additive light and cheaper than `screen`; `screen` is the fallback.

The per-project `--accent` tints the key light. This is how the 8 projects each get their own colour while staying one blue-anchored family — the accent lives in the *light*, not in the UI chrome.

**The loop:**

```ts
const stage = document.querySelector<HTMLElement>('.hero__stage')!;
const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : v > hi ? hi : v;

// rect is measured ONCE and only re-measured on debounced resize / ScrollTrigger.refresh.
// Never inside the event handler, never inside the ticker. (§E.7)
let rect = stage.getBoundingClientRect();

// The handler does nothing but store two numbers. No math, no DOM reads, no DOM writes. (§E.11)
let tx = 0, ty = 0;
stage.addEventListener('pointermove', (e) => {
  tx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;   // -1 … 1
  ty = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
}, { passive: true, signal: abortCtl.signal });

type LightLayer = {
  el: HTMLElement; lam: number; amp: number; x: number; y: number;
  setX: (v: number) => void; setY: (v: number) => void;
};

const L: LightLayer[] = [
  { el: key,  lam: 2.2, amp:  0.46, x: 0, y: 0, setX: noop, setY: noop },
  { el: spec, lam: 7.0, amp:  0.62, x: 0, y: 0, setX: noop, setY: noop },
  { el: cast, lam: 3.4, amp: -0.35, x: 0, y: 0, setX: noop, setY: noop },
];
for (const l of L) {
  l.setX = gsap.quickSetter(l.el, '--lx', 'px') as (v: number) => void;
  l.setY = gsap.quickSetter(l.el, '--ly', 'px') as (v: number) => void;
}

const REST_BIAS = 0.55;   // the light explores, but never fully leaves the vitrine
const CLAMP     = 0.85;

lightTicker = (_time: number, deltaMS: number) => {
  const dt = Math.min(deltaMS, 50) / 1000;     // clamp dt so a tab-switch stall can't teleport
  const gx = clamp(tx * REST_BIAS, -CLAMP, CLAMP);
  const gy = clamp(ty * REST_BIAS, -CLAMP, CLAMP);

  for (const l of L) {
    const a = 1 - Math.exp(-l.lam * dt);       // frame-rate-independent exponential decay
    l.x += (gx * l.amp - l.x) * a;
    l.y += (gy * l.amp - l.y) * a;
    l.setX(l.x * rect.width  * 0.42);
    l.setY(l.y * rect.height * 0.42);
  }
};
gsap.ticker.add(lightTicker);   // NOT its own requestAnimationFrame — see §C.4
```

Reduced-motion variant: same loop, `amp` scaled by `0.40` and every `lam` forced to `8.0` (§D).

**`REST_BIAS = 0.55` and `CLAMP = 0.85` are not decoration.** Without them, dragging the cursor to a screen corner pulls the key light entirely off the object and the vitrine goes dark — it looks like a bug. The light explores; it never leaves.

**`Math.min(deltaMS, 50)`** prevents a 3-second background-tab stall from teleporting the light on the first visible frame.

**Touch:** `pointermove` on a coarse pointer only fires while dragging. Disable the follow entirely on `(pointer: coarse)` and instead run a very slow autonomous drift — `λ` irrelevant, just a 24s `sine.inOut` yoyo across ±0.18 amplitude. It keeps the object alive on mobile without pretending there is a cursor.

### B.5 WebGL path (Phase 2 only — documented so it is not reinvented wrong)

If Three.js ever earns its place:

```js
scene.add(keyLight.target);              // ← without this the target's world matrix NEVER updates
                                          //    and the light appears frozen. This is the #1 bug.
const tgt = new THREE.Vector3();

function tick(dt) {
  tgt.set(gx * 3.2, 1.4 + gy * -1.8, 2.6);
  const a = 1 - Math.exp(-4.0 * dt);     // ← frame-rate-corrected alpha, NOT a constant.
  keyLight.target.position.lerp(tgt, a); //    Vector3.lerp takes alpha; every tutorial passes
  keyLight.target.updateMatrixWorld();   //    a constant and is therefore refresh-rate dependent.
}
```

Additional non-negotiables for that path:

- **No real-time shadow maps.** Use the same pre-baked `contact.png` on a plane. Shadow map re-render every frame (the light target moves every frame, so `shadow.autoUpdate = false` buys nothing) is the primary mobile frame-rate killer.
- Specular response comes from the material's `envMap` + `roughness`, not from more lights. One `DirectionalLight` (key) + one very low `AmbientLight` + an HDR env map. Three lights is already too many for the budget.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`. Uncapped DPR on a 3x Android phone is a 9× fill-rate bill.
- Render on demand: skip `renderer.render()` on frames where nothing moved beyond the breathing threshold.

### B.6 Acceptance test for "heavy"

Move the pointer from one edge of the stage to the other in ~100ms and release.
- The specular must begin moving on the **very next frame** (verify in a Performance trace: pointermove → style/paint on the same or next frame).
- The ambient wash must still be visibly settling **~1.2s later**.
- Nothing overshoots. If you see the light pass its target and come back, someone used an `elastic`/`back` ease or a spring with `damping < 1`. Remove it.

---

## 5. §C — ASTRO 7 INTEGRATION

### C.1 There is no `client:` directive here

The most common mistake on this exact task. **`client:*` directives apply only to UI-framework components** (React/Svelte/Vue/Solid islands). GSAP and Lenis are plain modules. A bare `<script>` tag inside a `.astro` file is already:

- bundled and tree-shaken by Vite,
- hoisted, deduplicated across component instances,
- emitted as `type="module"` (therefore deferred, executed after DOM parse).

That is exactly the behaviour we want, at zero framework cost. **Do not wrap the hero in a React island to get `client:load`.** That would ship a renderer we do not otherwise need and breaks the zero-JS-by-default posture.

```astro
---
// src/components/hero/Vitrine.astro
import { Image } from 'astro:assets';
import plate from '../../assets/objects/vitrine-01/plate.avif';
const { accent, occlusionBand } = Astro.props;
---
<section class="hero" data-accent={accent} data-band={occlusionBand.join(',')}>
  …
</section>

<script>
  import { initHero } from '../../scripts/hero';
  document.addEventListener('astro:page-load', initHero);
</script>
```

Pass data via `data-*` attributes. **Do not use `define:vars`** — it forces the script `is:inline`, which disables bundling, tree-shaking, and dedup.

### C.2 The one inline script (pre-paint, `<head>`)

```astro
<script is:inline>
  (() => {
    const stored = localStorage.getItem('motion');           // user override wins
    const sys = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const on = stored ? stored === 'full' : !sys;
    document.documentElement.dataset.motion = on ? 'full' : 'reduced';
  })();
</script>
```

This must be `is:inline` and in `<head>` so it runs **before first paint** — otherwise the reduced-motion user sees one frame of the full-motion initial state.

**Invariant I4 depends on this attribute.** All "start hidden" CSS is gated on it:

```css
/* Default (no JS, or attribute never set): everything at rest, fully legible. */
.line__inner { transform: none; opacity: 1; }

html[data-motion='full'] .line__inner  { transform: translateY(118%); opacity: 0; }
html[data-motion='full'] .hero__object { opacity: 0; }
```

If the bundle 404s, the hero renders as a beautiful static composition instead of a black rectangle.

### C.3 `gsap.matchMedia()` as the top-level structure

```ts
let mm: gsap.MatchMedia | null = null;
let lenis: Lenis | null = null;
let lightTicker: gsap.TickerCallback | null = null;
let lenisTicker: gsap.TickerCallback | null = null;

export function initHero() {
  if (mm) return;                                  // idempotence guard
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  mm = gsap.matchMedia();

  mm.add({
    motion:  '(prefers-reduced-motion: no-preference)',
    reduced: '(prefers-reduced-motion: reduce)',
    coarse:  '(pointer: coarse)',
  }, (ctx) => {
    const { motion, reduced, coarse } = ctx.conditions!;
    if (motion) { setupSmoothScroll(); buildFullIntro(); if (!coarse) startLightFollow(); }
    else        { buildReducedIntro(); if (!coarse) startLightFollow(0.40, 8.0); }
    return () => { /* matchMedia auto-reverts tweens; kill our extras here */ };
  });
}
```

`gsap.matchMedia()` reverts every tween created inside its callback automatically when the query stops matching or on `mm.revert()`. That covers reduced-motion toggling mid-session *and* teardown. Use it instead of hand-rolled `gsap.context()`.

### C.4 Lenis + ScrollTrigger + the light loop — one RAF, exactly

```ts
function setupSmoothScroll() {
  lenis = new Lenis({
    lerp: 0.10,
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false,        // never hijack native touch scrolling
  });

  lenis.on('scroll', ScrollTrigger.update);

  lenisTicker = (time: number) => lenis!.raf(time * 1000);  // gsap.ticker time is SECONDS,
  gsap.ticker.add(lenisTicker);                             // lenis.raf() wants MILLISECONDS
  gsap.ticker.lagSmoothing(0);
}
```

Four things that must all be true:

1. **`gsap.ticker` is the only RAF in the app.** Do **not** also call `requestAnimationFrame(lenis.raf)` — that is the classic double-RAF. Two loops means Lenis integrates twice per frame and the smoothing constant no longer means what you set.
2. **`time * 1000`.** GSAP's ticker passes seconds; Lenis expects milliseconds. Getting this wrong makes Lenis appear frozen (it thinks 0.016ms elapsed).
3. **`gsap.ticker.lagSmoothing(0)`.** GSAP normally clamps `deltaTime` after a long frame; that clamp desynchronises Lenis's internal integration and produces a scroll jump after any GC pause.
4. **The light loop rides the same ticker.** `gsap.ticker.add(updateLight)` — added *after* `lenisTicker` so scroll state is current. Never `requestAnimationFrame(updateLight)`.

**Do not use `ScrollTrigger.normalizeScroll()` with Lenis.** They both intercept wheel/touch and produce doubled or dropped deltas.

`ScrollTrigger.config({ ignoreMobileResize: true })` prevents a `refresh()` storm every time the mobile URL bar shows or hides. Combine with `svh` units — never `dvh` for the sticky stage, since `dvh` changes continuously during URL-bar animation and triggers exactly the refresh storm we just suppressed.

### C.5 View Transitions cleanup

With Astro's `<ClientRouter />`, a hoisted module script executes **once per module URL** for the whole session. After a client-side navigation the DOM is replaced but module-level state survives — so GSAP instances end up pointing at detached nodes, ScrollTriggers measure a document that no longer exists, and the ticker keeps running.

The only correct pattern:

```ts
document.addEventListener('astro:page-load',   initHero);     // fires on first load AND every nav
document.addEventListener('astro:before-swap', destroyHero);  // fires before the DOM is replaced

function destroyHero() {
  ScrollTrigger.getAll().forEach(t => t.kill());
  mm?.revert();  mm = null;                       // reverts every tween + inline style it set
  if (lenisTicker)  { gsap.ticker.remove(lenisTicker);  lenisTicker = null; }
  if (lightTicker)  { gsap.ticker.remove(lightTicker);  lightTicker = null; }
  lenis?.destroy(); lenis = null;
  abortCtl.abort();                               // removes pointermove/resize listeners
  gsap.ticker.lagSmoothing(500, 33);              // restore the default
}
```

Use one `AbortController` for every `addEventListener` in the hero (`{ signal: abortCtl.signal }`) so a single `.abort()` removes all of them. Recreate it in `initHero`.

The `if (mm) return;` guard in `initHero` handles the case where `astro:page-load` fires without a preceding `before-swap` (back/forward cache).

**Also required:** `ScrollTrigger.refresh()` after `astro:page-load` completes and after fonts settle — a late-swapping display serif changes the headline's height and every trigger's start/end. Call `document.fonts.ready.then(() => ScrollTrigger.refresh())` once.

### C.6 Imports and budget

```ts
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';   // ESM entry — tree-shakes.
                                                   // NOT 'gsap/dist/ScrollTrigger' (UMD, no shaking)
import Lenis from 'lenis';
```

| Package | min | brotli |
|---|---|---|
| gsap core | ~48kB | ~19kB |
| ScrollTrigger | ~22kB | ~8kB |
| lenis | ~12kB | ~4.5kB |
| hero.ts | ~8kB | ~3kB |
| **Hero island total** | | **~35kB br** |

Budget ceiling: **40kB brotli**. No Three.js in v1.

### C.7 Asset wiring

```astro
<link rel="preload" as="image" href={plate.src} type="image/avif" fetchpriority="high" />
<link rel="preload" as="font" type="font/woff2" crossorigin
      href="/fonts/editorial-new-ultralight-subset.woff2" />
```

- Object plate: `loading="eager"`, `fetchpriority="high"`, `decoding="async"`. Awaited via `.decode()` in the beat-0 gate.
- LQIP: base64 data-URI, inlined in the HTML. Zero requests.
- Fonts: **self-host and subset.** PP Editorial New is licensed — subset to exactly the glyphs used in the headline, the name, and the project titles (~40 glyphs, 12–20kB WOFF2). `font-display: block` — the block window hides inside beat 0.
- Fallback metrics to prevent CLS if it ever does swap:
  ```css
  @font-face { font-family: 'Editorial Fallback'; src: local('Georgia');
               size-adjust: 96%; ascent-override: 88%; descent-override: 22%; }
  ```

---

## 6. §D — `prefers-reduced-motion`

**Principle: remove motion, keep light, keep depth, keep hierarchy.** Reduced motion is not "no design" — the site must still look expensive. Everything that made this hero good (the blue-black void, the museum lighting, the occlusion, the oversized serif, the mono HUD, the grain) is *composition*, not motion. All of it survives.

| Beat | Full motion | Reduced |
|---|---|---|
| **0 · Cold start** | 820ms hairline draw + vertical growth into floor glow | Floor glow present at rest immediately. Optional 240ms **opacity-only** fade, no transform. |
| **1 · Materialize** | Object rise + settle + scale, keylight sweep, per-line `yPercent` mask-in @ 1.4s expo.out | No transforms anywhere. `.line__inner` `opacity 0 → 1`, **320ms**, `power1.out`, stagger **0.06**. Object: LQIP→sharp cross-fade only. Keylight placed at rest position instantly, no sweep. |
| **2 · Dwell** | 7.2/9.1/11.3s breathing loops; grain shift; caret blink | **All loops removed.** Grain static (no `steps()` animation). Caret static. |
| **2 · Light follow** | 3 masses, λ 2.2 / 7.0 / 3.4, full amplitude | **Kept, at 40% amplitude, λ = 8.0 for all three.** See rationale below. Disabled entirely on `(pointer: coarse)`. |
| **3 · Handoff** | Sticky stage, scrubbed dolly, seamless section merge, Lenis smooth scroll | **Lenis never instantiated** — smooth-scroll hijacking is a genuine reduced-motion violation. Stage is `position: static`, hero height `100svh`. ScrollTrigger degrades to `toggleActions: 'play none none reverse'` with a 300ms opacity-only reveal. |
| **Section boundary** | Deliberately invisible | A **1px hairline rule** at 12% opacity appears between hero and project 01, so the page still reads as structured without the motion that used to signal the transition. |

### Why the light-follow survives

It is worth being explicit, because it is the one judgement call here. `prefers-reduced-motion` targets vestibular triggers: large-area movement, parallax, scroll-coupled motion, zoom, spin. The keylight is **small-area, luminance-only, user-initiated, not scroll-coupled, and involves no motion of any object or text**. It is closer to a hover state than to a parallax. It is also the site's signature and the client's locked direction.

The honest resolution is not to guess on the user's behalf:

1. Default under reduced-motion = **40% amplitude, λ 8.0** (less drift, less travel).
2. Ship a **persistent user toggle** in the footer — `Motion · Full / Reduced` — writing `localStorage.motion`, read by the inline head script (§C.2), which **overrides** the system preference in both directions. A user who wants zero can get zero; a user on a device with reduce-by-default who wants the full thing can get it.
3. Reduced-motion **and** coarse pointer → off entirely (there is no cursor to follow).

### CSS safety net

```css
@media (prefers-reduced-motion: reduce) {
  html:not([data-motion='full']) *,
  html:not([data-motion='full']) *::before,
  html:not([data-motion='full']) *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The `:not([data-motion='full'])` guard is what lets the footer toggle re-enable motion for a user who explicitly asked for it.

---

## 7. §E — PERFORMANCE: what will drop frames, and the correct alternative

Ordered by how likely each is to actually bite on this hero.

### E.1 Animating `filter: blur()` on the object materialize
Blur is a full-surface raster pass **every frame**; cost scales with radius² × surface area. An 18px blur on a 900×900 layer at 60fps is dead on a mid-tier Android.
→ **Cross-fade two pre-blurred rasters.** The LQIP is already blurred at encode time. `opacity` only.
→ **Rule: static blur is fine, animated blur is not.** A `filter: blur(40px)` on an element that only ever receives `transform`/`opacity` is rasterised once into its layer and reused. Add `will-change: transform` to guarantee the promotion.

### E.2 `box-shadow` animation (the glow, the contact shadow)
`box-shadow` with a large blur repaints the element's entire bounding box + spread every frame and is never composited.
→ Separate absolutely-positioned `div` with a **pre-rendered radial-gradient or a pre-blurred PNG**, animated with `transform`/`opacity` only. This is why `contact.png` is in the asset contract.

### E.3 `backdrop-filter` anywhere in the hero
Forces a readback of everything behind the element, destroys layer caching, and on Adreno/Mali can halve the frame rate on its own.
→ **Do not use it.** Fake the frosted panel: semi-opaque background + 1px hairline border + the existing grain. If a real frosted nav is ever demanded, it must be a small fixed-size element, never animated, with nothing animating beneath it.

### E.4 `mix-blend-mode` on full-viewport layers
Blending disables the compositor fast path for the entire blend group.
→ `isolation: isolate` on `.hero__stage` to bound the group. Keep `.hero__spec` sized to the object's box, not the viewport. Grain stays viewport-sized but only ever animates `transform`. Profile `overlay` grain against a normal-blend variant and ship whichever holds 60fps — the visual difference at 0.045 opacity is small; the perf difference is not.

### E.5 Non-composited properties in scrubbed or per-frame animations
Forbidden in any scrubbed timeline or ticker callback: `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`, `font-size`, `letter-spacing`, `background-position`, `background-size`, `border-radius`, `filter`, `box-shadow`, `clip-path`.
→ `transform` (translate/scale/rotate) and `opacity` only. GSAP consolidates `x/y/scale/rotation` into one `transform` string — good — but audit that nothing else slipped in.
→ The one sanctioned exception is the beat-1 eyebrow `clip-path` wipe: a single small element, once, not scrubbed, not per-frame.

### E.6 `will-change` overuse
Each promoted layer costs GPU memory. Past ~20 layers on a 4GB Android the compositor starts evicting and you get texture flashes.
→ Exactly **7** promoted layers (§1). Release after the intro: `gsap.set(el, { willChange: 'auto' })` in `onComplete` for anything that has stopped moving.
→ Never per-character `SplitText` on the headline — that is 30+ layers for one heading.

### E.7 Layout thrash from ScrollTrigger
Calling `getBoundingClientRect()` / reading `offsetTop` inside `onUpdate` while also writing styles forces a synchronous layout every frame.
→ **Never measure in `onUpdate`.** Cache in `onRefresh`. Use `invalidateOnRefresh: true`. The pointer `rect` is cached and only recomputed on a debounced `resize` and on `ScrollTrigger.refresh`.
→ `ScrollTrigger.config({ ignoreMobileResize: true })`. Use `svh`, not `vh` (URL-bar dependent) and not `dvh` (continuously changing → refresh storm).

### E.8 The scrub value itself
`scrub: true` binds transforms directly to scroll position. Combined with Lenis's own smoothing you get double-smoothed jitter or, worse, perceived input lag.
→ `scrub: 0.6 – 1.0` (a number = GSAP catches up over that many seconds). Shipping value: **0.8** with Lenis `lerp: 0.10`.
→ Do **not** stack Lenis `lerp: 0.05` with `scrub: 1.5`. That is mush, and mush reads as a broken page, not a heavy one.

### E.9 Image decode jank
A 3000px alpha PNG decoding on the main thread at beat 1 is a 200–400ms freeze right where the intro lives.
→ AVIF, capped at **2× the largest CSS render slot** (object ≤ 720px CSS → 1440px asset, never 3000px), `decoding="async"`, and `await img.decode()` inside the beat-0 gate so the cost lands during the shutter. Budget ≤ 180kB per plate.

### E.10 Font loading
An unsubset display serif is 300–500kB and blocks the headline.
→ Subset to the actual glyph set (~12–20kB WOFF2), self-host, `preload`, `font-display: block`, gate beat 1 on `document.fonts.ready`, and set fallback metric overrides.

### E.11 High-polling-rate pointers
Gaming mice fire `pointermove` at 500–1000Hz. Any work in that handler is wasted 8–16× per frame.
→ Handler stores two numbers and returns. All math in the ticker. `{ passive: true }`. Do not use `getCoalescedEvents` — we only want the newest sample.

### E.12 Runtime-generated grain
Canvas/JS noise per frame is a main-thread killer.
→ Static 128px PNG tile, `steps(1, end)` transform shuffle at 12.5fps (§2 beat 2). Never `background-position`.

### E.13 `will-change` on the sticky element
`will-change: transform` on `position: sticky` establishes a containing block and breaks stickiness in Chromium.
→ `will-change` goes on children of `.hero__stage`, never on `.hero__stage` itself.

### E.14 Long tasks during the intro
Analytics, chat widgets, and CDN fonts all compete for the main thread in exactly the 0–2.5s window we are being graded on.
→ Self-host everything. Defer all third-party JS behind `requestIdleCallback` fired from the master timeline's `onComplete`.

### E.15 LCP risk — flag it, measure it, know the lever
The headline animates in from `opacity: 0`, so LCP will not be reported at the HTML's first paint. Chrome's exact treatment of opacity-animated text as an LCP candidate has shifted between versions — **do not reason about it, measure it in the field.**
→ If LCP exceeds 2.5s, the levers in order: (1) drop the beat-0 ceiling 1400 → 900ms and the floor 800 → 600ms; (2) move the headline mask-in from t=0.45 to t=0.25; (3) shorten the headline settle from 1.40 → 1.10s. Do not fix it by removing the intro.

### Verification protocol
1. Chrome DevTools: **Fast 4G + 4× CPU slowdown**, Performance panel, record 0–6s. Zero frames > 16.7ms during the intro; zero long tasks > 50ms after the bundle parses.
2. Layers panel: confirm **≤ 7** composited layers during dwell.
3. Rendering panel: **Paint flashing off** during dwell (breathing must be compositor-only — any green flash means something is repainting) and **Layer borders on** to confirm promotions.
4. Real device: Moto-G-class Android over remote debugging. Emulated throttling systematically under-reports GPU-bound cost, which is where `mix-blend-mode` and masks will bite.
5. Lighthouse mobile: LCP ≤ 2.5s, CLS ≤ 0.02, TBT ≤ 200ms.

---

## 8. Open decisions (not blocking implementation)

| # | Question | Owner | Default if unanswered |
|---|---|---|---|
| 1 | Final headline copy — "I turn constraints into objects." is still working | client | Ship the working line; the 2-line mask structure is copy-agnostic. |
| 2 | Does the hero object rotate through all 8 projects, or is it a dedicated hero object? | design-director | Dedicated hero object. Rotating objects breaks the type/silhouette composition rules in §A.4. |
| 3 | Does the footer motion toggle appear in v1? | design-director | Yes — §D depends on it for the honest reduced-motion answer. |
| 4 | Accent-per-project: does the hero use project 01's accent or a neutral hero accent? | design-director | Neutral hero accent (blue), projects diverge from it. |

---

## 9. Definition of done

- [ ] Shutter draws and becomes the floor glow with zero JS involvement.
- [ ] Intro renders at final state with the JS bundle blocked (I4).
- [ ] Headline visibly emerges from **behind** the object during mask-in.
- [ ] Specular responds on the next frame; ambient wash still settling ~1.2s later; nothing overshoots.
- [ ] Light never leaves the vitrine at any cursor position, including corners.
- [ ] Breathing is invisible when watched directly and felt when looked away from.
- [ ] Scroll from hero to project 01 shows no seam, no rule, no background change, no grain re-tile.
- [ ] `prefers-reduced-motion: reduce` renders a still composition that a stranger would call finished.
- [ ] Footer toggle overrides the system preference in both directions and persists.
- [ ] After 3 client-side navigations: `ScrollTrigger.getAll().length` returns to baseline, `gsap.ticker` has ≤ 2 callbacks, no detached-node retention in a heap snapshot.
- [ ] 60fps on the reference Android through the full intro + dwell + handoff.
- [ ] LCP ≤ 2.5s on Fast 4G + 4× CPU.
