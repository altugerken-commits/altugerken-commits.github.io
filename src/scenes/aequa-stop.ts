// FIRST STOP — AEQUA.
//
// Placeholder geometry standing in for the brewer: stacked primitives, built
// to be replaced by a real .glb without anything else in this file changing.
//
// There is no lighting rig in this scene and there should not be one. Adding
// lights to light a placeholder would mean the look changes the moment the
// real mesh lands. Instead the material derives everything from where it sits
// relative to the beam: radial distance from the axis drives illumination, a
// fresnel term picks out the silhouette, and a scan band sweeps the form when
// the stop is active. Swap the geometry, keep the material, keep the look.

import { STOPS, stopDepth } from '../lib/stops';

const AEQUA = STOPS.find((s) => s.id === 'aequa')!;

/** Camera looks this far below itself; the object sits on that point. */
const LOOK_AHEAD = 7;

const VERT = /* glsl */ `
  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uReveal;
  uniform float uScan;
  uniform float uRampFreq;
  uniform float uRampDrift;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform float uObjectY;

  varying vec3 vWorldPos;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    // Same world-space colour ramp the beam uses, so the object is lit by the
    // beam's actual colour at its own depth rather than a hand-picked accent.
    float g = 0.5 + 0.5 * sin(vWorldPos.y * uRampFreq + uRampDrift);
    vec3 beamCol = mix(uColorA, uColorB, g);

    // Illumination falls off with distance from the beam axis.
    float axis = length(vWorldPos.xz);
    float lit = exp(-axis * 0.55);

    // Silhouette. The rim is where a volumetric source reads hardest.
    float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.6);

    // A band travelling up the form while the stop is held — the "scanner"
    // reading of the beam interacting with an object.
    float local = vWorldPos.y - uObjectY;
    float band = exp(-pow((local - (fract(uTime * 0.22) * 6.0 - 3.0)) * 2.2, 2.0));

    vec3 col = vec3(0.012);                       // near-black body
    col += beamCol * fres * lit * 1.5;            // rim
    col += beamCol * band * uScan * lit * 0.9;    // scan sweep
    col += beamCol * lit * 0.06;                  // ambient wash off the beam

    gl_FragColor = vec4(col * uReveal, 1.0);
  }
`;

export interface AequaHandle {
  group: any;
  dispose: () => void;
}

export function initAequaStop(api: any, beam: any): AequaHandle {
  const { THREE, scene } = api;

  // The camera holds at -stopDepth and aims LOOK_AHEAD below itself, so this
  // is the world Y that lands dead centre of frame during the pause.
  const objectY = -stopDepth(AEQUA) - LOOK_AHEAD;

  const group = new THREE.Group();
  group.position.set(0, objectY, 0);
  scene.add(group);

  const uniforms = {
    uTime: beam.uniforms.shared.uTime,
    uRampFreq: beam.uniforms.rampFreq,
    uRampDrift: beam.uniforms.rampDrift,
    uColorA: beam.uniforms.shared.uColorA,
    uColorB: beam.uniforms.shared.uColorB,
    uReveal: { value: 0 },
    uScan: { value: 0 },
    uObjectY: { value: objectY },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms,
    transparent: true,
    depthWrite: true,
    toneMapped: false,
  });

  // Stacked brewer: square base, carafe, waist, cone dripper, lid.
  const parts: Array<[any, number]> = [
    [new THREE.BoxGeometry(2.3, 0.22, 2.3), -1.85],
    [new THREE.CylinderGeometry(0.95, 1.05, 1.7, 48, 1, true), -0.88],
    [new THREE.CylinderGeometry(0.52, 0.95, 0.34, 48, 1, true), 0.14],
    [new THREE.CylinderGeometry(1.25, 0.52, 1.25, 48, 1, true), 0.94],
    [new THREE.CylinderGeometry(1.3, 1.3, 0.1, 48), 1.62],
  ];

  const geos: any[] = [];
  for (const [geo, y] of parts) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = y;
    // Open-ended cylinders need both faces or the form reads hollow from below.
    mesh.material.side = THREE.DoubleSide;
    group.add(mesh);
    geos.push(geo);
  }

  const damp = (a: number, b: number, l: number, dt: number) =>
    a + (b - a) * (1 - Math.exp(-l * dt));

  const stop = api.onTick((_t: number, dt: number) => {
    const f = beam.focusOf.aequa ?? 0;

    uniforms.uReveal.value = damp(uniforms.uReveal.value, f, 5, dt);
    uniforms.uScan.value = damp(uniforms.uScan.value, f, 3.5, dt);

    // Slow presentation turn, and a rise into place as the stop takes hold.
    group.rotation.y += dt * 0.22 * (0.25 + f);
    group.position.y = objectY - (1 - uniforms.uReveal.value) * 2.2;
    const s = 0.82 + uniforms.uReveal.value * 0.18;
    group.scale.set(s, s, s);
    group.visible = uniforms.uReveal.value > 0.002;
  });

  return {
    group,
    dispose: () => {
      stop();
      group.removeFromParent();
      for (const g of geos) g.dispose();
      material.dispose();
    },
  };
}
