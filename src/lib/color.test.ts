import { expect, test } from "vitest";
import { toHex, toHsv } from "./color";

test("hex survives a round trip through HSV", () => {
  for (const hex of ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#1a4fd6", "#e8456b", "#fff3c4", "#808080"]) expect(toHex(...toHsv(hex))).toBe(hex);
});

test("hue 360 wraps to red", () => expect(toHex(360, 1, 1)).toBe("#ff0000"));
