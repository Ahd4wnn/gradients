import { createRenderer, type Renderer } from "../engine/renderer";
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
    }

    disconnectedCallback() {
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
      const w = Math.round(this.clientWidth * dpr);
      const h = Math.round(this.clientHeight * dpr);
      if (!w || !h) return; // hidden or collapsed: draw once it has a size
      this.#renderer.resize(w, h);
      this.#schedule();
    }

    #schedule() {
      cancelAnimationFrame(this.#raf);
      if (!this.#renderer || !this.#visible) return;
      this.#raf = requestAnimationFrame((now) => {
        const renderer = this.#renderer;
        if (!renderer) return;
        this.#start ||= now;
        const animate = this.#recipe.speed !== 0 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
        renderer.render(this.#recipe, animate ? now - this.#start : 0);
        if (animate) this.#schedule();
      });
    }
  }

  customElements.define("gradient-f", GradientF);
  // programmatic export for host pages; the e2e suite uses it too
  (window as unknown as { GradientF: unknown }).GradientF = { exportPng };
}

define();
