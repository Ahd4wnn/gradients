import { encodeRecipe, type Recipe } from "./recipe";

export function toHtml(r: Recipe, origin: string): string {
  return `<script type="module" src="${origin}/embed.js"></script>
<gradient-f recipe="${encodeRecipe(r)}" style="display:block;width:100%;height:100vh"></gradient-f>`;
}

export function toReact(r: Recipe, origin: string): string {
  return `// Load the runtime once, e.g. in your root layout:
//   <script type="module" src="${origin}/embed.js" />
export function Gradient() {
  return <gradient-f recipe="${encodeRecipe(r)}" style={{ display: "block", width: "100%", height: "100vh" }} />;
}`;
}
