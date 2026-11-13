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
  expect(allLayers.map((l) => l.id)).toEqual([
    "linear", "radial", "mesh", "shapes", "rings", "caustics", "clouds", "cells", "bars", "waves", "stripes",
    "warp", "ribbons", "melt",
    "fluted-glass", "holo-foil", "chrome", "satin", "prism", "beams", "frosted-glass", "tiled-glass",
    "gradient-map", "color-adjust", "thermal",
    "grain", "halftone", "dither", "line-screen", "vignette", "bloom", "chromatic",
    "cursor-push", "cursor-light",
  ]);
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

test("mesh handles sit where the shader puts the blobs, and dragging one pins the rest in place", async () => {
  const { mesh } = await import("./mesh");
  const p = { ...mesh.defaults };
  const before = mesh.handles!(p, 7);
  expect(before).toHaveLength(4);
  for (const h of before) {
    expect(h.x).toBeGreaterThanOrEqual(0);
    expect(h.x).toBeLessThanOrEqual(1);
  }
  const moved = mesh.moveHandle!(p, 7, 2, 0.1, 0.9);
  const after = mesh.handles!(moved, 7);
  expect(after[2]).toMatchObject({ x: 0.1, y: 0.9 });
  for (const i of [0, 1, 3]) {
    expect(after[i].x).toBeCloseTo(before[i].x, 3);
    expect(after[i].y).toBeCloseTo(before[i].y, 3);
  }
  // the seed no longer moves pinned blobs
  expect(mesh.handles!(moved, 99)[0].x).toBeCloseTo(before[0].x, 3);
  // uniforms always fill all six slots
  expect(mesh.uniforms(moved).uPoints).toHaveLength(12);
  expect(mesh.uniforms(moved).uPointCount).toBe(4);
});
