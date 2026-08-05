# Altug Erken — Portfolio

Personal portfolio for **Altug Erken** (Altuğ Erken), industrial designer, İstanbul.
Astro 7 + Tailwind 4, static output, dark-first with a light counterpart.

## Running it

Node 22.12+ is required. On this machine Node is **not on the default PATH** — use
`dev.cmd`, which prepends `C:\Program Files\nodejs` and starts the dev server:

```bash
./dev.cmd
```

Otherwise, the standard scripts:

| Command | Action |
| :------ | :----- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on `localhost:4321` (honours `$PORT`) |
| `npm run build` | Static production build to `./dist/` |
| `npm run check` | Astro + TypeScript diagnostics |
| `npm run preview` | Serve the built site locally |

`npm run build` transpiles without type-checking — run `npm run check` too before
calling a change green.

## Structure

```text
src/
├── components/   Field, Stage, Cursor, Nav, ZigZag, Contact
├── data/         projects.ts — the curated roster, order is deliberate
├── layouts/      Base.astro — head, fonts, theme, transitions, the clock
├── lib/          loop.ts — the single shared rAF clock
├── pages/        index.astro, work/[slug].astro
└── styles/       global.css — tokens, z-index scale, HUD + serif primitives
design/           Written specs: colour, type, motion, 3D pipeline
public/models/    <slug>.glb — Draco-compressed, dropped in per project
```

## Design rules that are locked

These are decided; treat them as constraints, not suggestions.

- **95% serene gallery / 5% technical HUD.** The HUD is 10px mono in the corners.
  It never grows to fill space.
- **Type and object share a depth plane.** The display name passes *behind* the
  staged object — occlusion is the signature device, and it must survive on
  mobile, so the name stacks rather than shrinking away.
- **The light moves, the object does not.** On pointer move the rig tracks the
  cursor; the model holds its ground. Differential lag is the whole trick.
- **No hand-written motion.** Raw GLSL and hand-authored GSAP are rejected. Motion
  comes from pulled `21st.dev` components. If that source is unavailable, report
  the blocker — do not hand-code a fallback.
- **No project numbering.** Projects carry their proper names; the sequence in
  `projects.ts` is curated by hand.
- **Accents are bespoke per project**, derived from each object's own material.
  The ground ladder stays blue-black (hue 220–225).
- **Display spelling is ASCII "Altug Erken"**; "Altuğ Erken" appears in the meta
  description and JSON-LD `alternateName`. Font subsetting **must** include
  `latin-ext` — `ğ Ğ ş Ş İ` are Latin Extended-A and die silently without it.

## The clock

Everything animated registers with `src/lib/loop.ts`. Lenis → `gsap.ticker` →
ScrollTrigger → every frame callback. **Nothing else may own a `requestAnimationFrame`** —
independent loops drift against each other, which is how a continuous flow turns
into parts that visibly disagree.

## View transitions

`<ClientRouter />` is on. Astro swaps the DOM on navigation, and component
`<script>` modules do **not** re-execute. Anything that captures DOM nodes in a
closure — the WebGL field, the stage, the cursor — must carry `transition:persist`,
or it is silently replaced by an uninitialised copy. `<html>` attributes are
replaced wholesale on swap, so anything set there (`data-cursor`) must be
re-asserted on `astro:after-swap`.

## Models

CAD is Fusion 360, which cannot export glTF. The path is FBX → Blender → Draco
`.glb` into `public/models/`, then set `model` in `projects.ts`. Run a **planar
dissolve decimate before collapse** — Fusion tessellates flat panels into
thousands of coplanar triangles, and without dissolving them collapse hits a hard
floor. Always `mesh.validate()` before export, and check the long axis: FBX often
lands lying along Y. See `design/3d-pipeline.md`.

## Tooling

`.mcp.json` registers the `21st.dev` server and is **project-scoped** — it is only
loaded when the session starts from this directory. It also requires
`API_KEY_21ST` in the environment.
