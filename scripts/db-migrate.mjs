// Apply db/schema.sql to DATABASE_URL. Idempotent. Usage: npm run db:migrate
import fs from "node:fs";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(fs.readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("schema applied");
} finally {
  await client.end();
}
