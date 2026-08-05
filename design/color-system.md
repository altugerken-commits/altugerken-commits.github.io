# Colour System — Altug Erken Portfolio

**Status:** locked v1
**Scope:** blue-anchored ultra-premium dark system. Ground ladder, text ramp, 8 project accents, grain, vitrine light pool, runtime theming.
**Validation:** every ratio in this document was computed with the WCAG 2.1 relative-luminance formula against the real hex values, not estimated. CVD figures use the Viénot/Brettel/Mollon LMS simulation.

---

## 1. The ground — blue-black, not neutral, not purple

The brief's hard constraint: reads as black, but has unmistakable blue temperature. Two failure modes to avoid — neutral `#0A0A0B` (dead, no temperature) and the Meditaterocket purple (hue 270+, wrong family for this client).

The whole ladder sits at **hue 220–225°**. That is azure/navy blue: 45° clear of violet, 40° clear of cyan. Blue temperature is carried by the **B−R delta**, which widens as the tier rises — 12 at the void, 45 at the hairline. The higher a surface floats, the more visibly blue it gets. That is doing the work a drop-shadow would do in a light UI: elevation is signalled by *chroma gain*, not by a grey step.

| Token | Hex | Hue | Sat | L | Rel. luminance | B−R | Role |
|---|---|---|---|---|---|---|---|
| `--void` | `#060A12` | 220° | 50% | 4.7% | 0.00299 | 12 | Page ground. The vitrine's black. |
| `--surface` | `#0F1727` | 220° | 44% | 10.6% | 0.00861 | 24 | Raised panel, case-study card, HUD block. |
| `--elevated` | `#1A2440` | 224° | 42% | 17.6% | 0.01852 | 38 | Modal, popover, hovered panel, sticky nav on scroll. |
| `--hairline` | `#2A3557` | 225° | 35% | 25.3% | 0.03727 | 45 | 1px rules, bracket corner markers, panel borders. |

**Tier separation (measured):**

| Step | Ratio |
|---|---|
| void → surface | 1.11:1 |
| surface → elevated | 1.17:1 |
| elevated → hairline | 1.27:1 |

These are deliberately shallow. In a huly.io-class dark UI, planes are separated by **hairline + glow**, not by fill contrast — a 1.5:1 fill step reads as grey plastic and kills the vitrine effect. The consequence is a rule, not an accident:

> **Never rely on fill alone to separate two planes.** Every panel gets either a `--hairline` border, a bracket corner marker, or an accent glow. The fill step is atmosphere; the hairline is the information.

Sat looks high (50% at the void) but at L 4.7% the absolute chroma is minute — it reads as black with a temperature, never as navy. That high HSL saturation is exactly what survives the grain overlay and keeps dark gradients from going grey.

---

## 2. Text — the warm bone has to go

**Verdict: warm bone `#EDEAE4` is wrong here. Committed value is `#E8ECF4` — a cool bone at hue 220°.**

Three reasons, in order of weight:

**(a) Simultaneous contrast amplifies it, it does not neutralise it.** `#EDEAE4` sits at hue ~40° (orange-yellow). Our ground is hue 220°. Those are 180° apart — near-exact complements. A warm off-white on a blue-black ground does not get pulled toward neutral by the surround; the opponent-channel response pushes it *further* warm. At the sizes this site uses — a display serif headline occupying a third of the viewport — that is a large field of colour, and it will read as cream/ivory. Ivory is paper, literary, warm. It fights museum vitrine, product-studio lighting, and cyberpunk HUD simultaneously.

**(b) A near-black ground drives almost no chromatic adaptation.** The usual counter-argument — "the eye will adapt and normalise it" — depends on the background being a strong adapting stimulus. At relative luminance 0.003 the void emits essentially nothing. The viewer stays adapted to their display white point, so the warm cast persists instead of being discounted. This is why warm-bone-on-dark works on a *mid*-dark warm-grey ground and fails on a blue near-black.

**(c) It spends the tension budget in the wrong place.** The palette's structural move is 6 blues plus 2 deliberate warm complements (Flux, Minium) as punctuation. If the body text is already warm, a copper accent has nothing to push against — the complement stops being an event and becomes the ambient temperature. Keeping text cool is what *buys* those two warm accents their impact.

The trap on the other side is icy blue-white (`#DDE8FF`-ish), which reads cheap-LCD and fatigues over a long case study. The resolution: **put the text at the same hue as the void, at the opposite end of the lightness axis.** One hue axis, two poles. `#E8ECF4` measures hue 220° — identical to `--void`'s 220°. It reads as neutral-cool paper under gallery light, not as blue.

### Text ramp

| Token | Hex | Hue | on `--void` | on `--surface` | on `--elevated` | Grade | Use |
|---|---|---|---|---|---|---|---|
| `--bone` | `#E8ECF4` | 220° | **16.73:1** | 15.13:1 | 12.94:1 | AAA | Display serif headlines, primary body. |
| `--bone-dim` | `#B9C2D6` | 221° | **11.09:1** | 10.02:1 | 8.58:1 | AAA | Secondary body, case-study running text. |
| `--muted` | `#8C98B2` | 221° | **6.84:1** | 6.18:1 | 5.29:1 | AA | Mono spec data, `( INHALE )`-style labels, metadata. |
| `--faint` | `#5C6880` | 220° | **3.54:1** | 3.20:1 | 2.73:1 | 3:1 only | Decorative rules, disabled, watermark numerals. |

`--faint` is **not text-safe**. It clears 3:1 on void and surface only — legal for large text (≥24px, or ≥18.66px bold) and UI graphics, illegal for body copy, and it fails even 3:1 on `--elevated` (2.73:1), so it must not be used on elevated panels at all.

No pure `#FFF` anywhere: `--bone` tops out at 93% L.

---

## 3. The 8 project accents

A controlled walk from teal, through the blue arc, into violet — then two warm complements as tension. All names are pigment / process / material terms, which suits an industrial designer and gives each project a handle that isn't "the blue one."

**Every one of the 8 canonical accents clears 4.5:1 on all three ground tiers.** Any project accent can carry body text on any surface.

| # | Name | Canonical | Hue | L | on void | on surface | on elevated | Grade | Character |
|---|---|---|---|---|---|---|---|---|---|
| 01 | **Patina** | `#2FC7AC` | 169° | 48% | **9.33:1** | 8.43:1 | 7.21:1 | AAA | Oxidised copper. Green-teal, the coolest green the family allows. |
| 02 | **Halide** | `#79E4F0` | 186° | 71% | **13.37:1** | 12.09:1 | 10.34:1 | AAA | Silver halide. Ice cyan, the brightest note. |
| 03 | **Cyanotype** | `#4FA6F5` | 209° | 64% | **7.65:1** | 6.91:1 | 5.92:1 | AAA | Blueprint. Process azure — the most "engineering drawing" of the set. |
| 04 | **Cobalt** | `#6289F8` | 224° | 68% | **6.09:1** | 5.51:1 | 4.71:1 | AA | The pigment. True blue, sits exactly on the ground's own hue. |
| 05 | **Ultramarine** | `#8A82FA` | 244° | 75% | **6.28:1** | 5.68:1 | 4.86:1 | AA | Lapis. Blue tipping into violet. |
| 06 | **Anodise** | `#B69EF5` | 257° | 79% | **8.68:1** | 7.85:1 | 6.71:1 | AAA | Anodised aluminium. Periwinkle — greyed violet, the metallic end. |
| 07 | **Flux** | `#E8A44E` | 34° | 61% | **9.29:1** | 8.40:1 | 7.19:1 | AAA | Solder flux. Amber-copper. Complement #1. |
| 08 | **Minium** | `#FF7A5C` | 11° | 68% | **7.73:1** | 6.99:1 | 5.98:1 | AAA | Red lead pigment. Coral. Complement #2. |

**Hue walk** — steps of 13–23° through the cool arc, then a 137° jump to the warm pair:

```
Patina 169  →  Halide 186  →  Cyanotype 209  →  Cobalt 224
       (+17)         (+23)             (+16)         (+20)
   →  Ultramarine 244  →  Anodise 257  ‖  Flux 34  →  Minium 11
              (+13)                       (jump 137)
```

Lightness is varied deliberately (48% → 79%) so the six blues are separated on *two* axes, not just hue. Patina is the dark anchor; Anodise the pale one.

### Saturated cores — glow and graphic only

Each accent has a second, high-chroma value used for glows, the vitrine light pool, and graphic fills. These are the "real" pigment values; the canonical above is the legible tint derived from them. **Their contrast is much lower and three of them are restricted:**

| # | Name | Core | Hue | on void | Verdict |
|---|---|---|---|---|---|
| 01 | Patina | `#0E9E8C` | 173° | 5.93:1 | Text-safe as well. |
| 02 | Halide | `#22C4D6` | 186° | 9.37:1 | Text-safe as well. |
| 03 | Cyanotype | `#1C7BE0` | 211° | 4.68:1 | Text-safe as well (thin margin — do not use under 16px). |
| 04 | Cobalt | `#2C4FE8` | 229° | **3.20:1** | **Graphic / icon only.** Never text. |
| 05 | Ultramarine | `#4436E6` | 245° | **2.75:1** | **Glow only.** Never text, never an icon, never a border that carries meaning. |
| 06 | Anodise | `#7B4BE8` | 258° | **3.79:1** | **Graphic / icon only.** Never text. |
| 07 | Flux | `#C77518` | 32° | 5.65:1 | Text-safe as well. |
| 08 | Minium | `#E8432A` | 8° | 4.97:1 | Text-safe as well. |

This split is the whole point: the deep blues are where the *mood* lives, and deep blue is physically incapable of hitting 4.5:1 on near-black (blue contributes only 0.0722 of relative luminance). So the deep value glows and the light value speaks. Never swap them.

### Colour-vision deficiency — the honest number

Six blues cannot be made distinguishable to a protanope or deuteranope. That is geometry, not a tuning failure: blue hues collapse onto the same confusion line. Measured worst pairs (RGB distance after simulation; under ~25 is effectively identical):

| Deficiency | Worst pair | Distance |
|---|---|---|
| Protanopia | Cobalt / Ultramarine | **2.0** — indistinguishable |
| Deuteranopia | Cobalt / Ultramarine | **10.1** — indistinguishable |
| Tritanopia | Cyanotype / Cobalt | 40.5 — distinguishable |

I retuned lightness to widen the gap as far as the blue arc allows (Cobalt L68 vs Ultramarine L75), which at least leaves a luminance cue. But the design rule is non-negotiable and must be enforced in build:

> **Project identity is never carried by colour alone.** Every project reference — index card, nav item, case-study header, filter chip — must always show the two-digit index (`01`–`08`) *and* the project name. Colour is the fourth cue, after number, name, and thumbnail. This is a WCAG 1.4.1 (Use of Color) requirement, not a nicety.

### Foreground on an accent-filled surface

Computed both ways for all 8. **`--void` wins every time, by a wide margin** — bone-on-accent never exceeds 2.75:1 and would fail everywhere.

| # | Name | void-on-accent | bone-on-accent | Use |
|---|---|---|---|---|
| 01 | Patina | **9.33:1** | 1.79:1 | void |
| 02 | Halide | **13.37:1** | 1.25:1 | void |
| 03 | Cyanotype | **7.65:1** | 2.19:1 | void |
| 04 | Cobalt | **6.09:1** | 2.75:1 | void |
| 05 | Ultramarine | **6.28:1** | 2.67:1 | void |
| 06 | Anodise | **8.68:1** | 1.93:1 | void |
| 07 | Flux | **9.29:1** | 1.80:1 | void |
| 08 | Minium | **7.73:1** | 2.17:1 | void |

So: solid accent button → `color: var(--void)`. Always. `--fg-on-accent` is tokenised to `--void` to make this impossible to get wrong.

### State colours

Kept out of the project accents so a project's identity colour can never be confused with a system signal.

| Token | Hex | on void | Grade |
|---|---|---|---|
| `--focus` | `#79E4F0` | 13.37:1 | AAA — 3px ring, `focus-visible` only |
| `--success` | `#3FCF9A` | 10.00:1 | AAA |
| `--warn` | `#E8A44E` | 9.29:1 | AAA |
| `--danger` | `#FF6B57` | 7.07:1 | AAA |

The focus ring is Halide, fixed, and does **not** follow the project accent — a focus indicator that changes colour per page is a usability regression, and Halide's 13.37:1 is the highest-contrast note available.

---

## 4. Film grain

Purpose is functional before it is aesthetic: 8-bit sRGB cannot represent a smooth gradient between relative luminance 0.003 and 0.019, so the vitrine light pool *will* band without dither. Grain is the dither.

Greyscale noise at mid-grey is neutral under `overlay`, so it perturbs both directions — which is what dithering requires. Plain `opacity` compositing of a grey tile would only lighten and would wash the blacks out; do not use it.

```css
--grain-tile: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
```

```css
.grain {
  position: fixed;
  inset: 0;
  z-index: 9000;
  pointer-events: none;
  background-image: var(--grain-tile);
  background-size: 160px 160px;   /* CSS px — halves to 80px visually at DPR2 */
  mix-blend-mode: overlay;
  opacity: 0.055;                 /* global */
}
.hero .grain { opacity: 0.09; }   /* hero carries the widest gradient, needs more dither */
```

**Performance rules (these matter for the 60fps gate):**

- **Do not add `will-change` or `transform: translateZ(0)` to the grain layer.** Promoting a full-viewport `mix-blend-mode` element forces the entire page into a composited blend group and costs more than it saves. Leave it unpromoted — it is a static raster, painted once.
- **Do not animate the grain by default.** Animated grain repaints a full-viewport layer every frame and is the single easiest way to lose 60fps on a mid-tier Android.
- Optional desktop-only shimmer, gated on pointer and motion preference, using `steps()` on `background-position` (cheap — no repaint of the tile itself, just an offset):

```css
@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
  .grain { animation: grain-shift 800ms steps(8, end) infinite; }
}
@keyframes grain-shift {
  0%   { background-position: 0 0; }
  100% { background-position: 160px 160px; }
}
@media (prefers-reduced-motion: reduce) { .grain { animation: none; } }
```

- `baseFrequency: 0.85` gives fine 1–2px grain. Lower it toward 0.6 for a coarser, more filmic tooth; anything under 0.4 reads as dirt.

---

## 5. The vitrine light pool

The signature interaction: **the object is static; the light moves.** The light pool is an ambient wash plus a tighter key, both tinted with the current project's `--accent-core`.

### Layer order (this is what produces the type-behind-object occlusion)

```
z 0   --void ground
z 10  ambient light pool        <- moves with heavy lag
z 20  oversized display type    <- lit by the pool, passes BEHIND the object
z 30  the object (PNG/WebP with alpha, or Three.js canvas)
z 40  key specular / bloom      <- moves with less lag, mix-blend-mode: screen
z 9000 grain
z 9500 HUD / nav / UI
```

Type sits at z20 and the object at z30, so the object occludes the type. The ambient pool at z10 sits *under* the type, which is what makes the headline look like it is being lit rather than glowing on its own.

### The pools

```css
.vitrine__ambient {
  position: absolute;
  top: 0; left: 0;
  width: 110vmax; aspect-ratio: 1;
  margin: -55vmax 0 0 -55vmax;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle closest-side,
    color-mix(in oklab, var(--accent-core) 30%, transparent)  0%,
    color-mix(in oklab, var(--accent-core) 16%, transparent) 24%,
    color-mix(in oklab, var(--accent-core)  6%, transparent) 48%,
    color-mix(in oklab, var(--accent-core)  2%, transparent) 68%,
    transparent 100%);
  will-change: transform;
}

.vitrine__key {
  position: absolute;
  top: 0; left: 0;
  width: 42vmax; aspect-ratio: 1;
  margin: -21vmax 0 0 -21vmax;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(circle closest-side,
    color-mix(in oklab, var(--accent-glow) 42%, transparent) 0%,
    color-mix(in oklab, var(--accent-glow) 14%, transparent) 38%,
    transparent 76%);
  will-change: transform;
}
```

`color-mix(in oklab, …)` rather than sRGB: mixing a saturated blue toward transparent in sRGB desaturates and goes grey through the midpoint. Oklab holds chroma across the ramp, which is what keeps the pool feeling like coloured light instead of fog.

**Measured — the pool does not blow out text.** At a 14% accent-core mix over the void (roughly the pool's peak), `--bone` still reads 13.6–15.6:1 and `--muted` 5.6–6.4:1 across all 8 accents. Headlines stay AAA at the brightest point of the light.

### Motion

Here `will-change: transform` **is** correct — these two elements are the only things moving, they are transform-only, and promoting them keeps the animation entirely on the compositor with zero repaint. Never animate the gradient stops or a `--pool-x` custom property that feeds the gradient; that repaints the layer every frame and will miss the frame budget.

```js
// GSAP quickTo — heavy, expensive, never spinny.
const ambientX = gsap.quickTo('.vitrine__ambient', 'x', { duration: 1.25, ease: 'power3.out' });
const ambientY = gsap.quickTo('.vitrine__ambient', 'y', { duration: 1.25, ease: 'power3.out' });
const keyX     = gsap.quickTo('.vitrine__key',     'x', { duration: 0.75, ease: 'power3.out' });
const keyY     = gsap.quickTo('.vitrine__key',     'y', { duration: 0.75, ease: 'power3.out' });
```

The **differential lag is the whole trick** — ambient at 1.25s, key at 0.75s. The two pools separate slightly during movement and resettle together, which reads as a heavy lamp on a boom rather than a cursor-follower. A single pool at a single duration reads cheap.

Bind to a throttled `pointermove` writing to a ref, and drive the `quickTo` calls from a single rAF loop — never call them directly from the event.

**Reduced motion:** park both pools at 50% / 42% of the hero box, no listener attached at all (do not attach and no-op — skip the rAF loop entirely to save the battery).

```css
@media (prefers-reduced-motion: reduce) {
  .vitrine__ambient, .vitrine__key {
    transform: translate3d(50%, 42%, 0) !important;
    will-change: auto;
  }
}
```

**Touch:** no pointer to track. Park the pools as above and let a slow ScrollTrigger drift on `y` carry the hero instead.

---

## 6. Runtime per-project theming

One data attribute on a wrapper swaps four variables; everything downstream — glows, borders, tints, the light pool — follows automatically.

```astro
<article data-accent="cyanotype">…</article>
```

Every project block sets:

| Variable | Meaning |
|---|---|
| `--color-accent` | Canonical, text-safe. Links, labels, active states. |
| `--color-accent-core` | Saturated. Light pool, graphic fills. Contrast-restricted — see §3. |
| `--color-accent-glow` | Glow/bloom source; same as core, named separately so it can be tuned without touching graphics. |
| `--color-accent-tint` | 8% accent over `--surface`. Panel fills, table row hover, chip backgrounds. |

Precomputed tint values (8% and 14% accent over `--surface`), so no runtime `color-mix` is needed for panel fills:

| # | Name | tint 8% | tint 14% |
|---|---|---|---|
| 01 | Patina | `#122532` | `#13303A` |
| 02 | Halide | `#172737` | `#1E3443` |
| 03 | Cyanotype | `#142237` | `#182B44` |
| 04 | Cobalt | `#162038` | `#1B2744` |
| 05 | Ultramarine | `#192038` | `#202645` |
| 06 | Anodise | `#1C2237` | `#262A44` |
| 07 | Flux | `#20222A` | `#2D2B2C` |
| 08 | Minium | `#221F2B` | `#31252E` |

### Tailwind 4 note — important

Use `@theme`, **not `@theme inline`**, for the accent tokens. Plain `@theme` compiles utilities to `var(--color-accent)`, so a `[data-accent="…"]` override further down the tree is picked up by `bg-accent` / `text-accent` / `border-accent` automatically. `@theme inline` bakes the literal value into the utility and runtime swapping silently stops working.

Static tokens (grounds, text ramp, the 8 named accents) are safe either way; they are declared in `@theme` here for consistency.

---

## 7. The CSS block

Paste into `src/styles/global.css` after `@import "tailwindcss";`.

```css
@import "tailwindcss";

@theme {
  /* ---- ground ladder: blue-black, hue 220-225 ---- */
  --color-void:      #060A12;
  --color-surface:   #0F1727;
  --color-elevated:  #1A2440;
  --color-hairline:  #2A3557;

  /* ---- text ramp: cool bone, hue 220 (same axis as the void) ---- */
  --color-bone:      #E8ECF4;  /* 16.73:1 on void — AAA */
  --color-bone-dim:  #B9C2D6;  /* 11.09:1 on void — AAA */
  --color-muted:     #8C98B2;  /*  6.84:1 on void — AA  */
  --color-faint:     #5C6880;  /*  3.54:1 on void — 3:1 graphic/large only */

  /* ---- 8 project accents: canonical (text-safe, >=4.5:1 on all tiers) ---- */
  --color-patina:       #2FC7AC;  /* 01  h169   9.33:1 */
  --color-halide:       #79E4F0;  /* 02  h186  13.37:1 */
  --color-cyanotype:    #4FA6F5;  /* 03  h209   7.65:1 */
  --color-cobalt:       #6289F8;  /* 04  h224   6.09:1 */
  --color-ultramarine:  #8A82FA;  /* 05  h244   6.28:1 */
  --color-anodise:      #B69EF5;  /* 06  h257   8.68:1 */
  --color-flux:         #E8A44E;  /* 07  h 34   9.29:1 */
  --color-minium:       #FF7A5C;  /* 08  h 11   7.73:1 */

  /* ---- saturated cores: glow + graphic. CONTRAST-RESTRICTED ---- */
  --color-patina-core:      #0E9E8C;  /* 5.93:1  text ok            */
  --color-halide-core:      #22C4D6;  /* 9.37:1  text ok            */
  --color-cyanotype-core:   #1C7BE0;  /* 4.68:1  text ok >=16px     */
  --color-cobalt-core:      #2C4FE8;  /* 3.20:1  GRAPHIC ONLY       */
  --color-ultramarine-core: #4436E6;  /* 2.75:1  GLOW ONLY          */
  --color-anodise-core:     #7B4BE8;  /* 3.79:1  GRAPHIC ONLY       */
  --color-flux-core:        #C77518;  /* 5.65:1  text ok            */
  --color-minium-core:      #E8432A;  /* 4.97:1  text ok            */

  /* ---- live accent slot (overridden by [data-accent]) ---- */
  --color-accent:       #6289F8;
  --color-accent-core:  #2C4FE8;
  --color-accent-glow:  #2C4FE8;
  --color-accent-tint:  #162038;

  /* foreground on any accent-filled surface — void wins on all 8 (6.09:1 worst) */
  --color-fg-on-accent: #060A12;

  /* ---- state colours (never follow the project accent) ---- */
  --color-focus:    #79E4F0;  /* 13.37:1 */
  --color-success:  #3FCF9A;  /* 10.00:1 */
  --color-warn:     #E8A44E;  /*  9.29:1 */
  --color-danger:   #FF6B57;  /*  7.07:1 */
}

@layer base {
  :root {
    color-scheme: dark;

    --grain-tile: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
    --grain-opacity: 0.055;
    --grain-opacity-hero: 0.09;

    --hairline-soft: color-mix(in oklab, var(--color-hairline) 55%, transparent);
    --glow-ambient:  color-mix(in oklab, var(--color-accent-core) 30%, transparent);
    --glow-key:      color-mix(in oklab, var(--color-accent-glow) 42%, transparent);
  }

  html { background-color: var(--color-void); color: var(--color-bone); }

  /* ---- per-project accent swap ---- */
  [data-accent="patina"]      { --color-accent: #2FC7AC; --color-accent-core: #0E9E8C; --color-accent-glow: #0E9E8C; --color-accent-tint: #122532; }
  [data-accent="halide"]      { --color-accent: #79E4F0; --color-accent-core: #22C4D6; --color-accent-glow: #22C4D6; --color-accent-tint: #172737; }
  [data-accent="cyanotype"]   { --color-accent: #4FA6F5; --color-accent-core: #1C7BE0; --color-accent-glow: #1C7BE0; --color-accent-tint: #142237; }
  [data-accent="cobalt"]      { --color-accent: #6289F8; --color-accent-core: #2C4FE8; --color-accent-glow: #2C4FE8; --color-accent-tint: #162038; }
  [data-accent="ultramarine"] { --color-accent: #8A82FA; --color-accent-core: #4436E6; --color-accent-glow: #4436E6; --color-accent-tint: #192038; }
  [data-accent="anodise"]     { --color-accent: #B69EF5; --color-accent-core: #7B4BE8; --color-accent-glow: #7B4BE8; --color-accent-tint: #1C2237; }
  [data-accent="flux"]        { --color-accent: #E8A44E; --color-accent-core: #C77518; --color-accent-glow: #C77518; --color-accent-tint: #20222A; }
  [data-accent="minium"]      { --color-accent: #FF7A5C; --color-accent-core: #E8432A; --color-accent-glow: #E8432A; --color-accent-tint: #221F2B; }

  /* focus ring is fixed Halide, never the project accent */
  :focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
    border-radius: 2px;
  }
}
```

---

## 8. Enforcement checklist for build + QA

- [ ] No `#000` and no `#FFF` anywhere in the codebase (grep).
- [ ] `--faint` never used for body copy, and never on `--elevated`.
- [ ] `--color-cobalt-core`, `--color-ultramarine-core`, `--color-anodise-core` never applied to text. Ultramarine core never applied to an icon or a meaningful border either.
- [ ] Solid accent buttons use `--color-fg-on-accent`, never `--color-bone`.
- [ ] Every project reference shows index + name, not colour alone (WCAG 1.4.1).
- [ ] Focus ring is Halide everywhere, including inside themed project blocks.
- [ ] Grain layer has no `will-change` / `translateZ`, and no animation under `prefers-reduced-motion: reduce`.
- [ ] Light pools are the only `will-change: transform` elements in the hero; nothing animates gradient stops.
- [ ] Panels are separated by hairline or glow, never by fill step alone.
- [ ] `@theme` used for accent tokens, not `@theme inline`.
