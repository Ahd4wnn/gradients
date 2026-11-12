import { expect, test } from "vitest";
import { toHtml, toReact } from "./embed";
import { DEFAULT_RECIPE, encodeRecipe } from "./recipe";

const enc = encodeRecipe(DEFAULT_RECIPE);

test("html snippet loads the runtime and carries the recipe", () => {
  const html = toHtml(DEFAULT_RECIPE, "https://example.test");
  expect(html).toContain('<script type="module" src="https://example.test/embed.js"></script>');
  expect(html).toContain(`<gradient-f recipe="${enc}"`);
});

test("react snippet carries the recipe", () => {
  const jsx = toReact(DEFAULT_RECIPE, "https://example.test");
  expect(jsx).toContain("https://example.test/embed.js");
  expect(jsx).toContain(`recipe="${enc}"`);
});
