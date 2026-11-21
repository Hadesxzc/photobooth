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
  { id: 13, name: 'Rosé' },
  { id: 14, name: 'Dreamy' },
  { id: 15, name: 'Milk Tea' },
  { id: 16, name: 'Peach' },
  { id: 17, name: 'Cherry' },
  { id: 18, name: 'Cloud' },
];

export interface Adjust {
  bright: number; // -1..1
  warm: number; // -1..1
  soft: number; // 0..1
}
export const NO_ADJUST: Adjust = { bright: 0, warm: 0, soft: 0 };

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
uniform float u_bright;
uniform float u_warm;
uniform float u_soft;
// Background replacement: person mask (video orientation) + backdrop placed in screen space.
uniform sampler2D u_bg;
uniform sampler2D u_mask;
uniform float u_useBg;
uniform float u_flip;
uniform vec4 u_bgMap;

vec3 src(vec2 uv) {
  vec3 c = texture2D(u_tex, uv).rgb;
  if (u_useBg > 0.5) {
    float m = smoothstep(0.3, 0.7, texture2D(u_mask, uv).r);
    vec2 scr = u_flip > 0.5 ? vec2(1.0 - uv.x, uv.y) : uv;
    vec3 b = texture2D(u_bg, clamp(scr * u_bgMap.xy + u_bgMap.zw, 0.0, 1.0)).rgb;
    c = mix(b, c, m);
  }
  return c;
}

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
  vec3 c = src(uv).rgb;
  if (u_soft > 0.0) {
    vec2 px = 2.5 / u_res;
    vec3 b = (src(uv + vec2(px.x, 0.0)).rgb + src(uv - vec2(px.x, 0.0)).rgb +
              src(uv + vec2(0.0, px.y)).rgb + src(uv - vec2(0.0, px.y)).rgb +
              src(uv + px).rgb + src(uv - px).rgb +
              src(uv + vec2(px.x, -px.y)).rgb + src(uv + vec2(-px.x, px.y)).rgb) * 0.125;
    float l = luma(c);
    float mid = smoothstep(0.12, 0.45, l) * (1.0 - smoothstep(0.8, 0.97, l));
    c = mix(c, b, u_soft * 0.75 * mid);
    c += u_soft * 0.04;
  }

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
    c.r = src(uv + vec2(0.006 + wob, 0.0)).r;
    c.b = src(uv - vec2(0.006 - wob, 0.0)).b;
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
  } else if (u_mode == 13) {
    c = sat(c, 0.9) * vec3(1.06, 0.96, 0.98) + vec3(0.06, 0.02, 0.04);
    c = mix(c, vec3(1.0, 0.82, 0.86), 0.12);
  } else if (u_mode == 14) {
    vec3 blur = (src(uv + vec2(0.004, 0.0)).rgb + src(uv - vec2(0.004, 0.0)).rgb +
                 src(uv + vec2(0.0, 0.005)).rgb + src(uv - vec2(0.0, 0.005)).rgb) * 0.25;
    c = mix(c, max(c, blur), 0.6);
    c = sat(c, 0.85) * 0.9 + vec3(0.1, 0.08, 0.1);
    c = mix(c, vec3(1.0, 0.92, 0.95), 0.1);
    c = vignette(c, v_uv, -0.25);
  } else if (u_mode == 15) {
    c = contrast(sat(c, 0.8), 0.9) * vec3(1.04, 1.0, 0.94) + vec3(0.06, 0.04, 0.02);
  } else if (u_mode == 16) {
    c = sat(c, 0.95) * vec3(1.06, 0.98, 0.92) + vec3(0.07, 0.03, 0.02);
    c = mix(c, vec3(1.0, 0.8, 0.7), 0.1);
  } else if (u_mode == 17) {
    c = contrast(sat(c, 1.2), 1.05) * vec3(1.08, 0.94, 0.98);
    c = mix(c, vec3(0.95, 0.45, 0.55), 0.08);
  } else if (u_mode == 18) {
    c = sat(c, 0.8) * 0.92 + vec3(0.1, 0.1, 0.13);
    c = mix(c, vec3(0.96, 0.95, 1.0), 0.12);
  }
  c += u_bright * 0.18;
  c.r += u_warm * 0.06;
  c.b -= u_warm * 0.07;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class FilterRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private tex: WebGLTexture;
  private prog: WebGLProgram;
  private shaders: WebGLShader[] = [];
  private parallel: { COMPLETION_STATUS_KHR: number } | null;
  private ready = false;
  private live: boolean;
  private bgTex: WebGLTexture | null = null;
  private maskTex: WebGLTexture | null = null;
  private bgSource: TexImageSource | null = null;
  private bgDirty = false;
  private mask: { data: Uint8Array; w: number; h: number } | null = null;
  private maskDirty = false;
  private bgMap: [number, number, number, number] = [1, 1, 0, 0];

  /**
   * `live`: an on-screen preview that is never read back, so the browser can skip keeping a copy of each frame.
   * The shader compiles in the background where the browser supports it (KHR_parallel_shader_compile), so
   * creating a renderer never freezes the page; live renderers skip frames until it's ready.
   */
  constructor(canvas: HTMLCanvasElement = document.createElement('canvas'), live = false) {
    this.canvas = canvas;
    this.live = live;
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: !live, premultipliedAlpha: false, antialias: false });
    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    this.parallel = gl.getExtension('KHR_parallel_shader_compile');
    const prog = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]] as const) {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      gl.attachShader(prog, sh);
      this.shaders.push(sh);
    }
    gl.linkProgram(prog); // Status is checked later, so the compile can finish off the main thread.
    this.prog = prog;
    this.tex = gl.createTexture()!;
  }

  /** True once the shader is compiled. With `wait`, blocks until it is (the old behaviour). */
  private prepare(wait: boolean): boolean {
    if (this.ready) return true;
    const gl = this.gl, prog = this.prog;
    if (!wait && this.parallel && !gl.getProgramParameter(prog, this.parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = this.shaders.map((sh) => gl.getShaderInfoLog(sh)).filter(Boolean).join('\n');
      throw new Error(log || gl.getProgramInfoLog(prog) || 'shader error');
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['u_tex', 'u_mode', 'u_time', 'u_res', 'u_mirror', 'u_bright', 'u_warm', 'u_soft', 'u_bg', 'u_mask', 'u_useBg', 'u_flip', 'u_bgMap'])
      this.loc[n] = gl.getUniformLocation(prog, n);
    gl.uniform1i(this.loc.u_bg, 1);
    gl.uniform1i(this.loc.u_mask, 2);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.ready = true;
    return true;
  }

  /** Backdrop to show behind the person (null = the real room). Uploaded once, on the next render. */
  setBackground(img: TexImageSource | null) {
    if (img === this.bgSource) return;
    this.bgSource = img;
    this.bgDirty = !!img;
  }

  /** Where the backdrop sits, as a screen-uv → backdrop-uv mapping (scale x/y, offset x/y). */
  setBackgroundMap(map: [number, number, number, number]) {
    this.bgMap = map;
  }

  /** Person mask for the current frame (255 = person), in the video's orientation; null = no mask yet. */
  setMask(mask: { data: Uint8Array; w: number; h: number } | null) {
    this.mask = mask;
    this.maskDirty = !!mask;
  }

  private texture(unit: number, existing: WebGLTexture | null) {
    const gl = this.gl;
    const t = existing ?? gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (!existing) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    return t;
  }

  /** Resolves once the shader is compiled, without blocking the page while it compiles. */
  async whenReady(): Promise<void> {
    while (!this.prepare(false)) await new Promise((r) => setTimeout(r, 16));
  }

  /** Draws `source` with the filter. A live renderer returns false (and draws nothing) while still compiling. */
  render(source: TexImageSource, w: number, h: number, mode: number, mirror: boolean, time: number, adj: Adjust = NO_ADJUST): boolean {
    if (!this.prepare(!this.live)) return false;
    const gl = this.gl;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    const useBg = !!(this.bgSource && this.mask);
    if (useBg) {
      if (this.bgDirty) {
        this.bgTex = this.texture(1, this.bgTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bgSource!);
        this.bgDirty = false;
      }
      if (this.maskDirty) {
        const m = this.mask!;
        this.maskTex = this.texture(2, this.maskTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, m.w, m.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, m.data);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
        this.maskDirty = false;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bgTex);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTex);
    }
    gl.uniform1f(this.loc.u_useBg, useBg ? 1 : 0);
    gl.uniform1f(this.loc.u_flip, mirror ? 1 : 0);
    gl.uniform4f(this.loc.u_bgMap, ...this.bgMap);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(this.loc.u_tex, 0);
    gl.uniform1i(this.loc.u_mode, mode);
    gl.uniform1f(this.loc.u_time, time % 1000);
    gl.uniform2f(this.loc.u_res, w, h);
    gl.uniform1f(this.loc.u_mirror, mirror ? 1 : 0);
    gl.uniform1f(this.loc.u_bright, adj.bright);
    gl.uniform1f(this.loc.u_warm, adj.warm);
    gl.uniform1f(this.loc.u_soft, adj.soft);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }
}

export async function loadUpload(file: Blob, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const tmp = document.createElement('canvas');
  tmp.width = Math.round(bmp.width * s);
  tmp.height = Math.round(bmp.height * s);
  tmp.getContext('2d')!.drawImage(bmp, 0, 0, tmp.width, tmp.height);
  return canvasToBlob(tmp);
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/jpeg', q = 0.92): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), type, q));
}
