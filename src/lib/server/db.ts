import { Pool } from "pg";

// One pool per server process; kept on globalThis so dev hot reloads do not open a new pool each time.
const g = globalThis as unknown as { gfPool?: Pool };

export function db(): Pool {
  if (!g.gfPool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example).");
    g.gfPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  }
  return g.gfPool;
}
