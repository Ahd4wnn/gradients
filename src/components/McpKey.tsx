"use client";
import { useState } from "react";

/** Creates or replaces the account's MCP key and shows it, with the command to connect, exactly once. */
export function McpKey({ hasKey }: { hasKey: boolean }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [had, setHad] = useState(hasKey);

  async function create() {
    if (had && !window.confirm("Replace your key? Anything using the old key stops working.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mcp/key", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.key !== "string") throw new Error(body.error ?? "Could not create a key. Try again.");
      setKey(body.key);
      setHad(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a key. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/api/mcp`;
  const command = `claude mcp add --transport http gradients ${url} --header "Authorization: Bearer ${key}"`;
  const config = JSON.stringify({ mcpServers: { gradients: { type: "http", url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
  const copy = (text: string, what: string) =>
    navigator.clipboard.writeText(text).then(
      () => setCopied(`${what} copied`),
      () => setCopied("Could not copy: select the text and copy it yourself."),
    );

  return (
    <div className="mt-6 space-y-4">
      <button type="button" className={key ? "btn" : "btn btn-primary"} disabled={busy} onClick={create}>
        {had ? "Replace key" : "Create key"}
      </button>
      {error && <p role="alert" className="text-sm text-white">{error}</p>}
      {key && (
        <div className="space-y-4 text-sm">
          <p className="text-white">Copy this now. It is not shown again; if you lose it, replace it.</p>
          <div>
            <p className="mb-2 text-white/60">Claude Code: run this in a terminal</p>
            <pre className="overflow-x-auto rounded-2xl bg-white/10 p-4 font-mono text-xs" tabIndex={0} aria-label="Claude Code command">{command}</pre>
            <button type="button" className="btn mt-2" onClick={() => copy(command, "Command")}>Copy command</button>
          </div>
          <div>
            <p className="mb-2 text-white/60">Other agents: add this to their MCP settings</p>
            <pre className="overflow-x-auto rounded-2xl bg-white/10 p-4 font-mono text-xs" tabIndex={0} aria-label="MCP settings">{config}</pre>
            <button type="button" className="btn mt-2" onClick={() => copy(config, "Settings")}>Copy settings</button>
          </div>
          <p role="status" aria-live="polite" className="min-h-5 text-white/70">{copied}</p>
        </div>
      )}
    </div>
  );
}
