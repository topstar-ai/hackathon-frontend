"use client";

import { useEffect, useRef } from "react";

// ============================================================================
// Animated WebGL fluid-plasma background (domain-warped fbm noise) in the
// Drift red/magenta/purple palette. Self-contained, no deps. Degrades to the
// CSS gradient on <body> if WebGL is unavailable.
// ============================================================================

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 3.0;
  p.x *= u_res.x / u_res.y;
  float t = u_time * 0.045;

  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3 - t)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t),
                fbm(p + 4.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 4.0 * r);

  vec3 c1 = vec3(0.015, 0.008, 0.03);  // near-black violet
  vec3 c2 = vec3(0.42, 0.03, 0.16);    // deep crimson
  vec3 c3 = vec3(0.78, 0.10, 0.42);    // magenta
  vec3 c4 = vec3(0.62, 0.30, 1.0);     // violet highlight

  vec3 col = mix(c1, c2, clamp(f * f * 1.7, 0.0, 1.0));
  col = mix(col, c3, clamp(length(r) * 0.75, 0.0, 1.0));
  col = mix(col, c4, clamp(pow(f, 3.0) * 1.1, 0.0, 1.0));

  float vig = smoothstep(1.25, 0.15, length(uv - 0.5));
  col *= 0.45 + 0.55 * vig;
  col *= 0.82;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false }) as WebGLRenderingContext) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext);
    if (!gl) return; // CSS gradient fallback handles this

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // fullscreen triangle
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      canvas!.width = w;
      canvas!.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const start = performance.now();
    let running = true;
    const onVis = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener("visibilitychange", onVis);

    function loop() {
      if (!running) return;
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10" aria-hidden>
      <canvas ref={ref} className="h-full w-full" />
      {/* readability scrim + top glow */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(177,92,255,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/65" />
    </div>
  );
}
