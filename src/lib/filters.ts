// Look filters run as one WebGL fragment shader so the live preview and the saved shot match exactly.
export const FILTERS = [
  { id: 0, name: 'Clean' },
  { id: 1, name: 'Mono' },
  { id: 2, name: 'Noir' },
  { id: 3, name: 'Warm Glow' },
  { id: 4, name: 'Night Teal' },
  { id: 5, name: 'Film Grain' },
  { id: 6, name: 'Scanlines' },
  { id: 7, name: 'VHS' },
  { id: 8, name: 'Pixelate' },
  { id: 9, name: 'Cartridge' },
  { id: 10, name: 'Lime Duo' },
  { id: 11, name: 'Faded Print' },
  { id: 12, name: 'Pop' },
];

const VERT = `
attribute vec2 a_pos;
uniform float u_mirror;
varying vec2 v_uv;
void main() {
  vec2 uv = a_pos * 0.5 + 0.5;
  uv.y = 1.0 - uv.y;
  if (u_mirror > 0.5) uv.x = 1.0 - uv.x;
  v_uv = uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform int u_mode;
uniform float u_time;
uniform vec2 u_res;

float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 vignette(vec3 c, vec2 uv, float s) {
  float d = distance(uv, vec2(0.5));
  return c * (1.0 - s * smoothstep(0.35, 0.85, d));
}
vec3 sat(vec3 c, float s) { float l = luma(c); return mix(vec3(l), c, s); }
vec3 contrast(vec3 c, float k) { return (c - 0.5) * k + 0.5; }

void main() {
  vec2 uv = v_uv;
  if (u_mode == 8 || u_mode == 9) {
    float cols = u_mode == 8 ? 72.0 : 128.0;
    vec2 block = vec2(u_res.x / cols);
    uv = (floor(uv * u_res / block) + 0.5) * block / u_res;
  }
  vec3 c = texture2D(u_tex, uv).rgb;

  if (u_mode == 1) {
    c = vec3(luma(c));
  } else if (u_mode == 2) {
    c = vec3(smoothstep(0.08, 0.9, luma(c)));
    c = vignette(c, v_uv, 0.7);
  } else if (u_mode == 3) {
    c = c * vec3(1.12, 1.0, 0.82) + vec3(0.05, 0.02, 0.0);
    c = mix(c, vec3(1.0, 0.9, 0.7), 0.08);
    c = vignette(c, v_uv, 0.35);
  } else if (u_mode == 4) {
    c = sat(c, 0.8) * vec3(0.82, 1.02, 1.12);
    c = contrast(c, 1.1);
    c = vignette(c, v_uv, 0.45);
  } else if (u_mode == 5) {
    c = sat(c, 0.75);
    c = mix(c, vec3(0.95, 0.9, 0.8), 0.12);
    c += (rand(v_uv * u_res + u_time) - 0.5) * 0.12;
    c = vignette(c, v_uv, 0.5);
  } else if (u_mode == 6) {
    float line = mod(floor(v_uv.y * u_res.y / 3.0), 2.0);
    c *= 0.78 + 0.22 * line;
    c = contrast(c, 1.15) * vec3(1.0, 1.03, 0.98);
    c = vignette(c, v_uv, 0.4);
  } else if (u_mode == 7) {
    float wob = sin(v_uv.y * 40.0 + u_time * 3.0) * 0.0015;
    c.r = texture2D(u_tex, uv + vec2(0.006 + wob, 0.0)).r;
    c.b = texture2D(u_tex, uv - vec2(0.006 - wob, 0.0)).b;
    c = sat(c, 0.7);
    float band = smoothstep(0.0, 0.02, abs(fract(v_uv.y - u_time * 0.08) - 0.5));
    c *= 0.85 + 0.15 * band;
    c += (rand(floor(v_uv * u_res / 2.0) + u_time) - 0.5) * 0.08;
  } else if (u_mode == 9) {
    float l = luma(c);
    float d = mod(floor(gl_FragCoord.x / 2.0) + floor(gl_FragCoord.y / 2.0), 2.0) * 0.08 - 0.04;
    float q = floor(clamp(l + d, 0.0, 0.999) * 4.0);
    vec3 p0 = vec3(0.059, 0.22, 0.059);
    vec3 p1 = vec3(0.188, 0.384, 0.188);
    vec3 p2 = vec3(0.545, 0.675, 0.059);
    vec3 p3 = vec3(0.608, 0.737, 0.059);
    c = q < 1.0 ? p0 : q < 2.0 ? p1 : q < 3.0 ? p2 : p3;
  } else if (u_mode == 10) {
    float l = smoothstep(0.05, 0.95, luma(c));
    c = mix(vec3(0.09, 0.075, 0.07), vec3(0.79, 0.95, 0.42), l);
  } else if (u_mode == 11) {
    c = sat(c, 0.6);
    c = c * 0.85 + vec3(0.12, 0.1, 0.08);
    c = mix(c, vec3(0.87, 0.84, 0.74), 0.1);
  } else if (u_mode == 12) {
    c = contrast(sat(c, 1.5), 1.12);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class FilterRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private tex: WebGLTexture;

  constructor(canvas: HTMLCanvasElement = document.createElement('canvas')) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
      gl.attachShader(prog, s);
    }
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['u_tex', 'u_mode', 'u_time', 'u_res', 'u_mirror']) this.loc[n] = gl.getUniformLocation(prog, n);
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  render(source: TexImageSource, w: number, h: number, mode: number, mirror: boolean, time: number) {
    const gl = this.gl;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(this.loc.u_tex, 0);
    gl.uniform1i(this.loc.u_mode, mode);
    gl.uniform1f(this.loc.u_time, time % 1000);
    gl.uniform2f(this.loc.u_res, w, h);
    gl.uniform1f(this.loc.u_mirror, mirror ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

let offscreen: FilterRenderer | null = null;

/** Applies a look filter to an uploaded image, downscaled to at most `max` px on the long side. */
export async function filterImageFile(file: Blob, mode: number, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  tmp.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  offscreen ??= new FilterRenderer();
  offscreen.render(tmp, w, h, mode, false, performance.now() / 1000);
  return canvasToBlob(offscreen.canvas);
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/jpeg', q = 0.92): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), type, q));
}
