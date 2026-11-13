"use client";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Handle } from "@/layers/types";

/**
 * Draggable dots over the preview. Coordinates are 0..1 with y up (the shader's uv), so a dot sits exactly where the
 * layer puts its point. Each dot is a button: arrow keys move it (Shift for bigger steps), so it works without a mouse.
 */
export function Handles({ handles, onMove }: { handles: Handle[]; onMove: (index: number, x: number, y: number) => void }) {
  const fromPointer = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    const box = e.currentTarget.parentElement!.getBoundingClientRect();
    onMove(i, (e.clientX - box.left) / box.width, 1 - (e.clientY - box.top) / box.height);
  };
  const key = (e: KeyboardEvent, h: Handle, i: number) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!d) return;
    e.preventDefault();
    onMove(i, h.x + d[0], h.y + d[1]);
  };
  return (
    <div className="pointer-events-none absolute inset-0">
      {handles.map((h, i) => (
        <button
          key={i}
          type="button"
          aria-label={`${h.label}: drag, or use the arrow keys`}
          title={h.label}
          className="handle pointer-events-auto"
          style={{ left: `${Math.min(100, Math.max(0, h.x * 100))}%`, top: `${Math.min(100, Math.max(0, (1 - h.y) * 100))}%`, background: h.color ?? "transparent" }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e, i);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e, i)}
          onKeyDown={(e) => key(e, h, i)}
        />
      ))}
    </div>
  );
}
