import { getLayer } from "../layers";
import type { UniformValue } from "../layers/types";
import { BLENDS, type Recipe } from "../lib/recipe";
import { OUTPUT, VERT, wrap } from "./glsl/common";

/** Smoothed cursor state in uv space (0..1, y up). `hover` is 0 when the cursor is away. */
export type Pointer = { x: number; y: number; vx: number; vy: number; hover: number };
export const REST: Pointer = { x: 0.5, y: 0.5, vx: 0, vy: 0, hover: 0 };

export type Renderer = {
  render(recipe: Recipe, timeMs: number, pointer?: Pointer): void;
  /** false if the GPU could not allocate targets of this size */
  resize(width: number, height: number): boolean;
  dispose(): void;
  maxSize: number;
};

type Program = { program: WebGLProgram; uniforms: { name: string; type: number; loc: WebGLUniformLocation }[] };
type Target = { tex: WebGLTexture; fbo: WebGLFramebuffer };

export function createRenderer(canvas: HTMLCanvasElement, preserve = false): Renderer | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: preserve });
  if (!gl) return null;
  const float = !!gl.getExtension("EXT_color_buffer_float");
  const programs = new Map<string, Program | null>();
  let targets: Target[] = [];
  let w = 0;
  let h = 0;

  function compile(body: string): Program {
    const shader = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const vs = shader(gl!.VERTEX_SHADER, VERT);
    const fs = shader(gl!.FRAGMENT_SHADER, wrap(body));
    const program = gl!.createProgram()!;
    gl!.attachShader(program, vs);
    gl!.attachShader(program, fs);
    gl!.linkProgram(program);
    if (!gl!.getProgramParameter(program, gl!.LINK_STATUS)) {
      const log = gl!.getShaderInfoLog(fs) || gl!.getProgramInfoLog(program) || "link failed";
      gl!.deleteProgram(program);
      throw new Error(log);
    }
    const uniforms: Program["uniforms"] = [];
    for (let i = 0; i < gl!.getProgramParameter(program, gl!.ACTIVE_UNIFORMS); i++) {
      const info = gl!.getActiveUniform(program, i)!;
      uniforms.push({ name: info.name.replace(/\[0\]$/, ""), type: info.type, loc: gl!.getUniformLocation(program, info.name)! });
    }
    return { program, uniforms };
  }

  // A layer whose shader fails is skipped; the rest of the stack still renders.
  function programFor(id: string, body: string): Program | null {
    if (!programs.has(id)) {
      try {
        programs.set(id, compile(body));
      } catch (e) {
        console.error(`[gradient-f] layer "${id}" failed to compile`, e);
        programs.set(id, null);
      }
    }
    return programs.get(id)!;
  }

  function draw(p: Program, src: WebGLTexture, dst: WebGLFramebuffer | null, values: Record<string, UniformValue>) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, dst);
    gl!.useProgram(p.program);
    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, src);
    for (const u of p.uniforms) {
      const v = values[u.name];
      if (v === undefined) continue;
      if (u.type === gl!.FLOAT) gl!.uniform1f(u.loc, v as number);
      else if (u.type === gl!.INT || u.type === gl!.SAMPLER_2D) gl!.uniform1i(u.loc, v as number);
      else if (u.type === gl!.FLOAT_VEC2) gl!.uniform2fv(u.loc, v as number[]);
      else if (u.type === gl!.FLOAT_VEC3) gl!.uniform3fv(u.loc, v as number[]);
    }
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  function freeTargets() {
    for (const t of targets) {
      gl!.deleteTexture(t.tex);
      gl!.deleteFramebuffer(t.fbo);
    }
    targets = [];
  }

  return {
    maxSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,

    resize(width, height) {
      w = Math.max(1, Math.floor(width));
      h = Math.max(1, Math.floor(height));
      canvas.width = w;
      canvas.height = h;
      freeTargets();
      for (let i = 0; i < 2; i++) {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
        const fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        targets.push({ tex, fbo });
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
          freeTargets();
          return false;
        }
      }
      return true;
    },

    render(recipe, timeMs, pointer = REST) {
      const out = programFor("__output", OUTPUT);
      if (targets.length < 2 || !out) return;
      const shared = { uPrev: 0, uRes: [w, h], uTime: (recipe.frame + timeMs * recipe.speed) / 1000, uSeed: recipe.seed, uOpacity: 1, uBlend: 0, uPointer: [pointer.x, pointer.y], uPointerVel: [pointer.vx, pointer.vy], uHover: pointer.hover };
      gl.viewport(0, 0, w, h);
      // a non-base layer placed first reads black
      let src = targets[1];
      gl.bindFramebuffer(gl.FRAMEBUFFER, src.fbo);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      let pass = 0;
      for (const l of recipe.layers) {
        const def = l.hidden ? undefined : getLayer(l.type);
        const p = def && programFor(def.id, def.fragment);
        if (!def || !p) continue;
        const dst = targets[pass++ % 2];
        draw(p, src.tex, dst.fbo, { ...def.uniforms({ ...def.defaults, ...l.params }), ...shared, uOpacity: l.opacity ?? 1, uBlend: Math.max(0, BLENDS.indexOf(l.blend ?? "normal")) });
        src = dst;
      }
      draw(out, src.tex, null, shared);
    },

    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
