'use client';

// THE DEAD-FRONT FIELD.
//
// Adapted from 21st.dev "Halftone Dots · LED screen" (Paper Shaders, Apache-2.0).
// Four deliberate departures from the pulled component, each load-bearing:
//
//  1. PALETTE — the stock greys (#111111/#FAFAFA/#D4D4D4/#525252) are replaced by
//     this site's blue-black ladder, and swapped again for the paper ladder in
//     the light theme. Polarity flips; the restraint does not.
//
//  2. ALPHA — stock output is `vec4(col, 1.0)`, i.e. an opaque full-screen fill.
//     That is exactly what produced the hard tonal seam a previous build already
//     fixed once. Here `shade()` returns the dot mask as alpha, so the gaps
//     between dots are genuinely transparent and the page's own --ground shows
//     through. Lit dots paint, dead dots do not — which is what "dead-front"
//     means. The canvas keeps `premultipliedAlpha: false` + SRC_ALPHA blending
//     to match the convention the old field used.
//
//  3. CLOCK — the stock component owns a private requestAnimationFrame. This one
//     registers with lib/loop.ts, so it is phase-locked to Lenis, ScrollTrigger
//     and the Three.js stage. A watchdog starts a private rAF only if the shared
//     clock never arrives (module-graph split), so it can never silently freeze.
//
//  4. STILLNESS — timeScale is dropped from 0.822 to 0.30. At stock speed the
//     matrix reads as an animation; at 0.30 it reads as atmosphere, which is the
//     95/5 rule doing its job behind the object.

import { useEffect, useRef, useState } from 'react';
import { onFrame } from '@/lib/loop';

const VERT = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_offset u_space.xy

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

// Straight sRGB mixing. OKLab is stripped: every colour in this ladder shares a
// hue, so perceptual blending costs instructions and changes nothing visible.
vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mix(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

// Returns dot colour in .rgb and the dot's coverage in .a. The coverage IS the
// alpha channel — that is the whole trick that keeps this field seam-free.
vec4 shade(vec2 p, float t) {
  float cells = 13.0 + u_intensity * 42.0;
  vec2 grid = p * cells;
  vec2 id = floor(grid);
  vec2 local = fract(grid) - 0.5;
  if (mod(id.y, 2.0) > 0.5) local.x += 0.5;
  local.x = fract(local.x + 0.5) - 0.5;
  float source = fbm(p * 2.1 + vec2(t * 0.025, -t * 0.018) + u_seed);
  source = mix(source, 0.5 + 0.5 * sin(p.x * 2.7 + p.y * 1.9), 0.35);
  float radius = (0.08 + source * 0.36) * mix(0.55, 1.45, u_paramA);
  float grain = (hash21(id + u_seed) - 0.5) * u_intensity * 0.08;
  float dotMask = 1.0 - smoothstep(radius - 0.055, radius + 0.025, length(local) + grain);
  return vec4(palette(source), dotMask);
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);

  p *= u_scale;
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }

  vec4 sh;
  if (u_blur > 0.0) {
    float pe = u_blur * u_scale;
    sh  = shade(p, u_time) * 0.36;
    sh += shade(p + vec2(pe, 0.0), u_time) * 0.16;
    sh += shade(p - vec2(pe, 0.0), u_time) * 0.16;
    sh += shade(p + vec2(0.0, pe), u_time) * 0.16;
    sh += shade(p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    sh = shade(p, u_time);
  }

  vec3 col = sh.rgb;
  float alpha = sh.a;

  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;

  // The vignette attenuates COVERAGE, not just colour: dots thin out toward the
  // edges instead of darkening, so the field dissolves rather than framing.
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    alpha *= 1.0 - u_vignette * smoothstep(0.25, 1.0, vd);
  }
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(alpha, 0.0, 1.0));
}
`;

const hexToRgb = (hex: string): [number, number, number] => {
  const v = hex.replace('#', '');
  const i = parseInt(v, 16);
  return [((i >> 16) & 255) / 255, ((i >> 8) & 255) / 255, (i & 255) / 255];
};

// The ground ladder, verbatim from global.css. Dark: --ground -> --hair, so a
// lit dot never exceeds the hairline colour. Light: --ground -> --ink-faint.
const LADDER = {
  dark: ['#060A12', '#0F1727', '#1A2440', '#2A3557'],
  light: ['#EDEEF2', '#DADDE5', '#B4BAC7', '#8B93A3'],
} as const;

const U = {
  colorCount: 4,
  scale: 1.48,
  intensity: 0.52,
  paramA: 0.51,
  warp: 0.186,
  detail: 2.752,
  contrast: 1.005,
  brightness: 0.0,
  saturation: 1.0,
  hue: 0.0,
  vignette: 0.55,
  blur: 0.0,
  grain: 0.032,
  seed: 1.0,
  rotate: 0.6458,
  offsetX: 0.0,
  offsetY: 0.0,
  drift: 0.0,
  timeScale: 0.3,
};

export function HalftoneField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error('[HalftoneField]', gl.getShaderInfoLog(s));
      return s;
    };

    const program = gl.createProgram()!;
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[HalftoneField]', gl.getProgramInfoLog(program));
      return;
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uni = {
      colors: gl.getUniformLocation(program, 'u_colors'),
      scene: gl.getUniformLocation(program, 'u_scene'),
      shape: gl.getUniformLocation(program, 'u_shape'),
      surface: gl.getUniformLocation(program, 'u_surface'),
      finish: gl.getUniformLocation(program, 'u_finish'),
      transform: gl.getUniformLocation(program, 'u_transform'),
      space: gl.getUniformLocation(program, 'u_space'),
    };

    const paintPalette = () => {
      const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
      const rungs = LADDER[theme];
      const flat: number[] = [];
      for (let i = 0; i < 8; i++) flat.push(...hexToRgb(rungs[Math.min(i, rungs.length - 1)]));
      gl.uniform3fv(uni.colors, new Float32Array(flat));
    };
    paintPalette();
    document.addEventListener('themechange', paintPalette);

    gl.uniform4f(uni.shape, U.scale, U.intensity, U.paramA, U.warp);
    gl.uniform4f(uni.surface, U.detail, U.contrast, U.brightness, U.saturation);
    gl.uniform4f(uni.finish, U.hue, U.vignette, U.blur, U.grain);
    gl.uniform4f(uni.transform, U.seed, U.rotate, U.drift, 0);
    gl.uniform4f(uni.space, U.offsetX, U.offsetY, 0, 0);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Half-res backing store, same as the field this replaces: the dot matrix
      // is low-frequency, and this costs a quarter of the fragments.
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr * 0.5));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr * 0.5));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e?.isIntersecting ?? true; });
    io.observe(canvas);

    const draw = (t: number) => {
      if (!visible || document.hidden) return;
      resize();
      // Reduced motion gets the field, frozen at a pleasing phase — same
      // bargain the previous implementation struck.
      gl.uniform4f(uni.scene, canvas.width, canvas.height, reduced ? 14 : t * U.timeScale, U.colorCount);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // --- clock ---------------------------------------------------------------
    // The shared clock is the goal, but it cannot be assumed: this island
    // hydrates on client:load while gsap.ticker is started by Base's hoisted
    // <script>, and on a cold load that chunk can arrive later. So rather than
    // decide once, the two clocks converge — a private rAF covers the gap and
    // stands down the instant the shared ticker starts driving.
    let driven = false;
    let raf = 0;
    let fallbackStart = 0;

    const stopShared = onFrame((t) => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      driven = true;
      (window as any).__fieldClock = 'shared';
      draw(t);
    });

    const privateLoop = (now: number) => {
      if (driven) { raf = 0; return; }   // shared ticker took over; yield to it
      if (!fallbackStart) fallbackStart = now;
      draw((now - fallbackStart) / 1000);
      raf = requestAnimationFrame(privateLoop);
    };

    const watchdog = window.setTimeout(() => {
      if (!driven) {
        (window as any).__fieldClock = 'private (awaiting shared)';
        raf = requestAnimationFrame(privateLoop);
      }
    }, 250);

    draw(0);
    setReady(true);
    canvas.setAttribute('data-ready', '');

    return () => {
      window.clearTimeout(watchdog);
      stopShared();
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener('themechange', paintPalette);
      gl.deleteBuffer(buf);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} data-field aria-hidden="true" />;
}

export default HalftoneField;
