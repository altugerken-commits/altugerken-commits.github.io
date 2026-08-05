// The roster. Sequence is fixed and curated — do not reorder.
//
// Projects carry their proper names and nothing else: there is deliberately no
// index/number on this type. The order of this array IS the curation.
//
// `accent` is the exact material hex supplied by the client. It drives the
// WebGL material/lighting and the glow, and must never be altered.
//
// Several of those hexes are unusable as UI text: anthracite #292B2C
// disappears on the void, and the near-whites (#E2E6E9, #F5F5F0, #EBE3D5)
// disappear on paper. So each project also carries a deliberately chosen
// legible variant per theme. The material colour stays true; only the UI
// tint shifts.

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  material: string;
  year: string;
  accent: string;   // exact client hex — WebGL + glow
  onDark: string;   // legible on --void
  onLight: string;  // legible on --paper
  model: string | null; // .glb dropped into public/models/ — null until uploaded
  summary: string;
}

export const projects: Project[] = [
  {
    slug: 'shifu-26-bodywork',
    title: "Shifu 26' Bodywork",
    subtitle: 'Formula Student · Aerodynamic Bodywork',
    material: 'Carbon / Composite Laminate',
    year: '2026',
    accent: '#FF5E00',
    onDark: '#FF7A33',
    onLight: '#C23F00',
    model: '/models/shifu-26-bodywork.glb',
    summary:
      'Bodywork for a Formula Student chassis, resolved around cooling, driver egress and a single continuous surface.',
  },
  {
    slug: 'vitra-v-motion-concept',
    title: 'Vitra V-Motion Concept',
    subtitle: 'Seating · Motion Study',
    material: 'Anthracite Polymer',
    year: '2025',
    accent: '#292B2C',
    onDark: '#A8ADB2',
    onLight: '#292B2C',
    model: null,
    summary:
      'A seating concept for Vitra built on a single articulating spine, where posture change is the product rather than a feature of it.',
  },
  {
    slug: 'nomad-brewer',
    title: 'Nomad Brewer',
    subtitle: 'Portable Brewing · Vessel',
    material: 'Anodised Al 6061',
    year: '2025',
    accent: '#E2E6E9',
    onDark: '#E2E6E9',
    onLight: '#6E767C',
    model: '/models/nomad-brewer.glb',
    summary:
      'A brewer that packs into its own volume — deep-drawn body, machined collar, no loose parts to lose in a bag.',
  },
  {
    slug: 'riflesso-poliform',
    title: 'Riflesso',
    subtitle: 'Concept Handle Design for Poliform',
    material: 'Dark Anodised Aluminium',
    year: '2025',
    accent: '#595D60',
    onDark: '#A9AFB4',
    onLight: '#4A4E51',
    model: null,
    summary:
      'A cabinet handle that reads as a fold in the door rather than an object attached to it. Extruded, then relieved by hand.',
  },
  {
    slug: 'oyster-chocolate',
    title: 'Oyster Chocolate',
    subtitle: 'Confectionery · Structural Packaging',
    material: 'Moulded Pulp / Off-White',
    year: '2024',
    accent: '#F5F5F0',
    onDark: '#F5F5F0',
    onLight: '#7A7A6E',
    model: null,
    summary:
      'A shell that opens the way the thing it is named for opens — one hinge, one gesture, no adhesive.',
  },
  {
    slug: 'victorinox-knife-concept',
    title: 'Victorinox Knife Concept',
    subtitle: 'Tool · Mechanism Study',
    material: 'Cellidor / Stainless',
    year: '2024',
    accent: '#DA291C',
    onDark: '#F4553F',
    onLight: '#B01F14',
    model: null,
    summary:
      'A re-think of the pivot stack: fewer layers, same tool count, and a scale that finally sits flat in a pocket.',
  },
  {
    slug: 'retro-tech-mp3-player',
    title: 'Retro-Tech MP3 Player',
    subtitle: 'Audio · Tactile Interface',
    material: 'Cream ABS / Knurled Alloy',
    year: '2024',
    accent: '#EBE3D5',
    onDark: '#EBE3D5',
    onLight: '#857C6B',
    model: null,
    summary:
      'Physical transport controls, one wheel, no screen worth looking at. Built for the pocket, not the feed.',
  },
  {
    slug: 'hipp-multiuse-package',
    title: 'HIPP Multiuse Package',
    subtitle: 'FMCG · Refill System',
    material: 'Mono-material PP',
    year: '2023',
    accent: '#5C8A47',
    onDark: '#8FBF74',
    onLight: '#47692F',
    model: null,
    summary:
      'A mono-material pack that survives its own contents and returns as something else. One polymer, so it can actually be recycled.',
  },
];

export const bySlug = (s: string) => projects.find((p) => p.slug === s);
