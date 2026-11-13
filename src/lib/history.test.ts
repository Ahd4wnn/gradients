import { expect, test } from "vitest";
import { record, redo, start, undo } from "./history";

test("each unkeyed change is its own step, and undo/redo walk them", () => {
  let h = start(0);
  h = record(h, 1, undefined, 10);
  h = record(h, 2, undefined, 20);
  expect(undo(h).present).toBe(1);
  expect(undo(undo(h)).present).toBe(0);
  expect(undo(undo(undo(h))).present).toBe(0); // nothing left: unchanged
  expect(redo(undo(undo(h))).present).toBe(1);
  expect(redo(h)).toBe(h);
});

test("a slider drag is one step, but the same control later is a new one", () => {
  let h = start(0);
  for (let i = 1; i <= 5; i++) h = record(h, i, "0:amount", i * 50);
  expect(h.past).toEqual([0]);
  h = record(h, 6, "0:amount", 5000);
  expect(h.past).toEqual([0, 5]);
  h = record(h, 7, "1:amount", 5050); // a different control, even quickly after
  expect(h.past).toEqual([0, 5, 6]);
});

test("a new change after undo drops the redo branch, and undo never merges into the next edit", () => {
  let h = record(record(start(0), 1, "k", 0), 2, undefined, 10);
  h = undo(h);
  h = record(h, 9, "k", 20);
  expect(h.future).toEqual([]);
  expect(h.past).toEqual([0, 1]);
});

test("history is capped", () => {
  let h = start(0);
  for (let i = 1; i <= 150; i++) h = record(h, i, undefined, i);
  expect(h.past.length).toBe(100);
  expect(h.past[0]).toBe(50);
});
