"use client";
import dynamic from "next/dynamic";

// Client-only: the recipe lives in the URL, so there is nothing useful to render on the server,
// and reading it at first render avoids a load-time race with early edits.
const Studio = dynamic(() => import("./Studio"), { ssr: false });

export default function StudioLoader() {
  return <Studio />;
}
