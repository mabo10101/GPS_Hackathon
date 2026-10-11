import { useEffect, useRef } from 'react';

/** How far the center recedes: center tiles are 1 / (1 + bend) of edge size, so 0.5 makes them two thirds. */
export const TILE_BEND = 0.5;
/** How much the bend also follows vertical distance: 0 bends only side to side, 1 is a round funnel. */
export const TILE_BEND_VERTICAL = 0.25;
/** Drift speed toward the bottom-left, in CSS pixels per second. Bars move slower for parallax. */
export const TILE_SPEED = 10;
export const BAR_SPEED = 6;

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uBend;
uniform float uBendVertical;
uniform float uTileSpeed;
uniform float uBarSpeed;
out vec4 outColor;

const vec3 CREAM = vec3(1.0, 0.965, 0.835);
const vec3 BAR = vec3(1.0, 0.878, 0.478);
const vec3 TILE = vec3(1.0, 0.788, 0.016);

float roundBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 res = uRes / uDpr;
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uDpr;
  vec2 d = p - res * 0.5;
  // Cone: sampling magnifies toward the center line, so tiles shrink as they recede.
  // Each axis is measured against its own half-size so the narrow width still bends fully.
  vec2 n = d / (0.5 * res);
  float r = clamp(length(vec2(n.x, n.y * uBendVertical)), 0.0, 1.0);
  // Smooth bowl: local tile scale is 1 + bend * (1 - r^2), so there is no crease at the
  // center line and edge tiles keep their natural size.
  vec2 q = d * (1.0 + uBend * (1.0 - r * r / 3.0)) + res * 0.5;

  // Content drifts toward the bottom-left (screen y points down).
  vec2 barP = q + vec2(1.0, -1.0) * uBarSpeed * uTime;
  vec2 tileP = q + vec2(1.0, -1.0) * uTileSpeed * uTime;
  float aa = fwidth(q.x) * 1.2;

  vec2 barCell = mod(barP, 120.0);
  float bar = max(1.0 - smoothstep(10.0 - aa, 10.0 + aa, barCell.x), 1.0 - smoothstep(10.0 - aa, 10.0 + aa, barCell.y));

  vec2 tileCell = floor(tileP / 120.0);
  float stagger = mod(tileCell.y, 2.0) * 8.0;
  vec2 local = vec2(mod(tileP.x - stagger, 120.0), mod(tileP.y, 120.0));
  float tile = 1.0 - smoothstep(-aa, aa, roundBox(local - vec2(65.0), vec2(38.0), 14.0));

  vec3 color = mix(CREAM, BAR, bar * 0.55);
  color = mix(color, TILE, tile * 0.45);
  // Soft vignette sells the depth of the cone.
  color *= mix(0.94, 1.0, r);
  outColor = vec4(color, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader error');
  return shader;
}

/** Animated 3DS-style tile background. Falls back to the CSS pattern behind it if WebGL2 is unavailable. */
export default function TileField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: false });
    if (!canvas || !gl) return;

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    } catch {
      return;
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const uRes = uniform('uRes');
    const uDpr = uniform('uDpr');
    const uTime = uniform('uTime');
    gl.uniform1f(uniform('uBend'), TILE_BEND);
    gl.uniform1f(uniform('uBendVertical'), TILE_BEND_VERTICAL);
    gl.uniform1f(uniform('uTileSpeed'), TILE_SPEED);
    gl.uniform1f(uniform('uBarSpeed'), BAR_SPEED);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      gl.uniform1f(uTime, still ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.classList.add('is-ready');
      if (!still) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="in-tilefield" aria-hidden="true" />;
}
