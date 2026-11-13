const PATHS = {
  up: "M8 13V3M3.5 7.5 8 3l4.5 4.5",
  down: "M8 3v10M3.5 8.5 8 13l4.5-4.5",
  close: "M4 4l8 8M12 4l-8 8",
  plus: "M8 3v10M3 8h10",
  undo: "M6 3.5 3 6.5l3 3M3 6.5h6.5a3.5 3.5 0 0 1 0 7H8",
  redo: "M10 3.5l3 3-3 3M13 6.5H6.5a3.5 3.5 0 0 0 0 7H8",
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
