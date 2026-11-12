import { describe, expect, test } from "vitest";
import { allLayers, getLayer, usesPointer } from "./index";

const HEX = /^#[0-9a-f]{6}$/i;

describe.each(allLayers)("layer $id", (def) => {
  test("defaults match controls", () => {
    expect(Object.keys(def.defaults).sort()).toEqual(def.controls.map((c) => c.key).sort());
    for (const c of def.controls) {
      const v = def.defaults[c.key];
      if (c.type === "range") {
        expect(typeof v).toBe("number");
        expect(v).toBeGreaterThanOrEqual(c.min);
        expect(v).toBeLessThanOrEqual(c.max);
      } else if (c.type === "select") expect(c.options).toContain(v);
      else if (c.type === "toggle") expect(typeof v).toBe("boolean");
      else if (c.type === "points") {
        const points = v as number[];
        expect(points.length % 2).toBe(0);
        expect(points.length).toBeLessThanOrEqual(c.max * 2);
        for (const n of points) expect(Number.isFinite(n)).toBe(true);
      } else {
        const list = v as string[];
        expect(list.length).toBeGreaterThanOrEqual(c.min);
        expect(list.length).toBeLessThanOrEqual(c.max);
        for (const hex of list) expect(hex).toMatch(HEX);
      }
    }
  });

  test("uniforms are finite numbers", () => {
    for (const u of Object.values(def.uniforms(def.defaults)))
      for (const n of [u].flat()) expect(Number.isFinite(n)).toBe(true);
  });

  test("fragment defines layer()", () => {
    expect(def.fragment).toContain("vec4 layer(vec2 uv)");
  });
});

test("registry lists every layer in menu order and ignores prototype keys", () => {
  expect(allLayers.map((l) => l.id)).toEqual(["linear","radial","mesh","warp","fluted-glass","grain","halftone","dither","holo-foil","chrome","satin","prism","beams","shapes","rings","frosted-glass","tiled-glass","ribbons","melt","cursor-push","cursor-light"]);
  for (const bad of ["constructor", "__proto__", "toString", "nope", 7, null, undefined]) expect(getLayer(bad)).toBeUndefined();
});

test("usesPointer is false until a layer opts in", () => {
  const base = { v: 1 as const, seed: 1, frame: 0, speed: 0 };
  const mesh = { type: "mesh", params: {} };
  expect(usesPointer({ ...base, layers: [mesh] })).toBe(false);
  expect(usesPointer({ ...base, layers: [{ type: "nope", params: {} }] })).toBe(false);
  expect(usesPointer({ ...base, layers: [mesh, { type: "cursor-light", params: {} }] })).toBe(true);
  expect(usesPointer({ ...base, layers: [mesh, { type: "cursor-push", params: {}, hidden: true }] })).toBe(false);
  expect(usesPointer({ ...base, layers: [{ type: "mesh", params: { follow: 0.5 } }] })).toBe(true);
  expect(usesPointer({ ...base, layers: [{ type: "radial", params: { follow: 0 } }] })).toBe(false);
  // nothing that existed before cursor effects reacts by default
  const old = allLayers.filter((l) => l.kind !== "cursor").map((l) => ({ type: l.id, params: {} }));
  expect(usesPointer({ ...base, layers: old })).toBe(false);
});
