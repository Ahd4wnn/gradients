/** Undo history as plain data, so it can be tested without React. */
export type History<T> = { past: T[]; present: T; future: T[]; key?: string; at: number };

const LIMIT = 100;
/** Edits to the same control closer together than this are one undo step (a slider drag, a handle drag). */
const MERGE_MS = 1000;

export const start = <T>(present: T): History<T> => ({ past: [], present, future: [], at: 0 });

/** `key` names the control being edited; repeated edits with the same key merge. No key: always a new step. */
export function record<T>(h: History<T>, next: T, key: string | undefined, now: number): History<T> {
  if (Object.is(next, h.present)) return h;
  const merge = key !== undefined && key === h.key && now - h.at < MERGE_MS;
  return { past: merge ? h.past : [...h.past, h.present].slice(-LIMIT), present: next, future: [], key, at: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], at: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), at: 0 };
}
