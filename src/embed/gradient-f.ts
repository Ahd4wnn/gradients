import { createRenderer, REST, type Pointer, type Renderer } from "../engine/renderer";
import { usesPointer } from "../layers";
import { exportPng } from "../lib/exportPng";
import { cssFallback, decodeRecipe, type Recipe } from "../lib/recipe";

const STYLE =
  "<style>:host{display:block;position:relative;overflow:hidden}canvas{display:block;width:100%;height:100%}" +
  "p{position:absolute;inset:auto 0 0 0;margin:0;padding:.75rem;font:14px system-ui,sans-serif;color:#fff;background:#0009}</style>";

function define() {
  // also guards against the script being included twice, and against running on the server
  if (typeof window === "undefined" || customElements.get("gradient-f")) return;

  class GradientF extends HTMLElement {
    static observedAttributes = ["recipe"];
    #root = this.attachShadow({ mode: "open" });
    #canvas: HTMLCanvasElement | null = null;
    #renderer: Renderer | null = null;
    #recipe: Recipe = decodeRecipe(null);
    #raf = 0;
    #start = 0;
    #visible = true;
    // raw cursor in viewport pixels (null = away), the smoothed state the shaders see, and the last frame time
    #client: { x: number; y: number } | null = null;
    #pointer: Pointer = { ...REST };
    #lastFrame = 0;
    #tracking = false;
    // The handlers only store or clear the position; all maths happens once per frame in #stepPointer.
    #onMove = (e: PointerEvent) => {
      this.#client = { x: e.clientX, y: e.clientY };
      this.#schedule();
    };
    #onGone = () => {
      this.#client = null;
      this.#schedule();
    };
    // a finger lifting ends the hover; a mouse button releasing does not
    #onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") this.#onGone();
    };
    #onScroll = () => this.#schedule();
    #sizes = new ResizeObserver(() => this.#resize());
    #views = new IntersectionObserver((entries) => {
      this.#visible = entries[entries.length - 1].isIntersecting;
      this.#schedule();
    });

    connectedCallback() {
      // a fresh canvas per connection: dispose() loses the old canvas's context for good
      this.#root.innerHTML = STYLE;
      const canvas = (this.#canvas = document.createElement("canvas"));
      canvas.addEventListener("webglcontextlost", (e) => {
        if (canvas !== this.#canvas) return;
        e.preventDefault();
        this.#renderer = null;
        cancelAnimationFrame(this.#raf);
        this.#fallback();
      });
      canvas.addEventListener("webglcontextrestored", () => {
        if (canvas === this.#canvas) this.#init();
      });
      this.#root.append(canvas);
      this.#init();
      this.#sizes.observe(this);
      this.#views.observe(this);
      this.#track(usesPointer(this.#recipe));
    }

    disconnectedCallback() {
      this.#track(false);
      this.#sizes.disconnect();
      this.#views.disconnect();
      cancelAnimationFrame(this.#raf);
      const renderer = this.#renderer;
      this.#renderer = null;
      this.#canvas = null;
      renderer?.dispose();
    }

    attributeChangedCallback(_name: string, _old: string | null, value: string | null) {
      this.#recipe = decodeRecipe(value);
      if (this.#canvas) this.#track(usesPointer(this.#recipe));
      if (this.#canvas && !this.#renderer) this.#fallback();
      this.#schedule();
    }

    #init() {
      if (!this.#canvas) return;
      this.#renderer = createRenderer(this.#canvas);
      if (!this.#renderer) return this.#fallback();
      this.style.background = "";
      this.#canvas.style.visibility = "";
      this.#root.querySelector("p")?.remove();
      this.#resize();
    }

    #fallback() {
      if (!this.#canvas) return;
      this.style.background = cssFallback(this.#recipe);
      this.#canvas.style.visibility = "hidden";
      if (this.#root.querySelector("p")) return;
      const note = document.createElement("p");
      note.textContent = "Live preview is unavailable: WebGL2 is switched off or was interrupted.";
      this.#root.append(note);
    }

    #resize() {
      if (!this.#renderer) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.round(this.clientWidth * dpr);
      let h = Math.round(this.clientHeight * dpr);
      if (!w || !h) return; // hidden or collapsed: draw once it has a size
      // a very tall or wide element can exceed the GPU's texture limit: draw smaller and let CSS stretch it
      const fit = Math.min(1, this.#renderer.maxSize / Math.max(w, h));
      w = Math.max(1, Math.floor(w * fit));
      h = Math.max(1, Math.floor(h * fit));
      if (!this.#renderer.resize(w, h)) return this.#fallback();
      // resizing clears the canvas; draw now, before the browser paints, so resizing never flashes black
      this.#draw(performance.now());
    }

    #schedule() {
      cancelAnimationFrame(this.#raf);
      if (!this.#renderer || !this.#visible) return;
      this.#raf = requestAnimationFrame((now) => this.#draw(now));
    }

    /** Listen for the cursor only while this gradient uses it. On `window`, because text and buttons often sit on top of a gradient and would swallow events aimed at the element. */
    #track(on: boolean) {
      on &&= !matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (on === this.#tracking) return;
      this.#tracking = on;
      const act = on ? "addEventListener" : "removeEventListener";
      window[act]("pointermove", this.#onMove as EventListener, { passive: true });
      window[act]("pointerup", this.#onUp as EventListener, { passive: true });
      window[act]("pointercancel", this.#onGone);
      window[act]("blur", this.#onGone);
      window[act]("scroll", this.#onScroll, { passive: true, capture: true });
      document.documentElement[act]("pointerleave", this.#onGone);
      if (!on) {
        this.#client = null;
        this.#pointer = { ...REST };
      }
    }

    /** Advance the smoothed cursor by `dt` seconds. Returns true while it is still moving or fading. */
    #stepPointer(dt: number): boolean {
      const p = this.#pointer;
      const rect = this.getBoundingClientRect();
      const c = this.#client;
      const inside = !!c && rect.width > 0 && rect.height > 0 && c.x >= rect.left && c.x <= rect.right && c.y >= rect.top && c.y <= rect.bottom;
      const ease = (seconds: number) => 1 - Math.exp(-dt / seconds);
      let gap = 0;
      if (inside && c) {
        const tx = (c.x - rect.left) / rect.width;
        const ty = 1 - (c.y - rect.top) / rect.height;
        // arriving from rest: start at the cursor, so the effect does not sweep in from where it last was
        if (p.hover < 0.01) {
          p.x = tx;
          p.y = ty;
          p.vx = p.vy = 0;
        }
        const nx = p.x + (tx - p.x) * ease(0.12);
        const ny = p.y + (ty - p.y) * ease(0.12);
        if (dt > 0) {
          const clamp = (v: number) => Math.max(-3, Math.min(3, v));
          p.vx += (clamp((nx - p.x) / dt) - p.vx) * ease(0.1);
          p.vy += (clamp((ny - p.y) / dt) - p.vy) * ease(0.1);
        }
        p.x = nx;
        p.y = ny;
        gap = Math.hypot(tx - p.x, ty - p.y);
      } else {
        // keep the last position while fading out; only the velocity and strength decay
        p.vx -= p.vx * ease(0.1);
        p.vy -= p.vy * ease(0.1);
      }
      const target = inside ? 1 : 0;
      p.hover += (target - p.hover) * ease(inside ? 0.2 : 0.25);
      const settled = Math.abs(target - p.hover) < 0.01 && Math.hypot(p.vx, p.vy) < 0.002 && gap < 0.0005;
      if (settled) {
        // land exactly, so a settled frame at rest is bit-identical to one with no cursor effect
        p.hover = target;
        p.vx = p.vy = 0;
      }
      return !settled;
    }

    #draw(now: number) {
      const renderer = this.#renderer;
      if (!renderer) return;
      this.#start ||= now;
      const animate = this.#recipe.speed !== 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the first frame after a pause has no previous time: treat it as an instant
      const dt = this.#lastFrame ? Math.min(0.1, (now - this.#lastFrame) / 1000) : 0;
      this.#lastFrame = now;
      const moving = this.#tracking && this.#stepPointer(dt);
      renderer.render(this.#recipe, animate ? now - this.#start : 0, this.#tracking ? this.#pointer : undefined);
      if (animate || moving) this.#schedule();
      else this.#lastFrame = 0;
    }
  }

  customElements.define("gradient-f", GradientF);
  // programmatic export for host pages; the e2e suite uses it too
  (window as unknown as { GradientF: unknown }).GradientF = { exportPng };
}

define();
