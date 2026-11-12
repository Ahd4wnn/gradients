const PATHS = {
  up: "M8 13V3M3.5 7.5 8 3l4.5 4.5",
  down: "M8 3v10M3.5 8.5 8 13l4.5-4.5",
  close: "M4 4l8 8M12 4l-8 8",
  plus: "M8 3v10M3 8h10",
};

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  );
}
