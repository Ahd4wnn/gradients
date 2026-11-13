import { expect, test, type APIRequestContext } from "@playwright/test";
import { createHash } from "node:crypto";
import pg from "pg";
import { decodeRecipe } from "../src/lib/recipe";
import { TEST_EMAIL_DOMAIN } from "./global-setup";

// Runs as the paid test account (see global-setup.ts). Talks to /api/mcp the way an agent does: JSON-RPC over POST.
const ORIGIN = "http://localhost:3000";
let db: pg.Client;
let paidId: string;

test.beforeAll(async () => {
  process.loadEnvFile(".env.local");
  db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  paidId = (await db.query(`select id from users where email = 'e2e-paid@${TEST_EMAIL_DOMAIN}'`)).rows[0].id;
  await db.query("delete from api_keys where user_id = $1", [paidId]);
  await db.query("delete from mcp_usage where user_id = $1", [paidId]);
});
test.afterAll(async () => {
  await db.query("delete from users where email like 'e2e-new-%@' || $1", [TEST_EMAIL_DOMAIN]);
  await db.end();
});

let nextId = 1;
const call = (request: APIRequestContext, key: string | null, method: string, params?: object) =>
  request.post("/api/mcp", { headers: key ? { Authorization: `Bearer ${key}` } : {}, data: { jsonrpc: "2.0", id: nextId++, method, params } });
const tool = async (request: APIRequestContext, key: string, name: string, args: object = {}) => (await (await call(request, key, "tools/call", { name, arguments: args })).json()).result;
/** A working key for the paid account, written straight to the database (the route that makes keys is rate-limited). */
async function dbKey(): Promise<string> {
  const key = `gf_test_${Date.now()}_${nextId++}`;
  await db.query("insert into api_keys (key_hash, user_id) values ($1, $2) on conflict (user_id) do update set key_hash = excluded.key_hash", [createHash("sha256").update(key).digest("hex"), paidId]);
  return key;
}
const newKey = async (request: APIRequestContext) => (await (await request.post("/api/mcp/key", { headers: { Origin: ORIGIN } })).json()).key as string;

test("an agent can connect, list tools and create a gradient", async ({ request }) => {
  const key = await newKey(request);
  expect(key).toMatch(/^gf_[A-Za-z0-9_-]{32}$/);
  // only a hash is stored
  const stored = (await db.query("select key_hash from api_keys where user_id = $1", [paidId])).rows[0].key_hash;
  expect(stored).toBe(createHash("sha256").update(key).digest("hex"));

  const init = await (await call(request, key, "initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "0" } })).json();
  expect(init.result.protocolVersion).toBe("2025-03-26");
  expect(init.result.capabilities).toEqual({ tools: {} });
  expect(init.result.serverInfo.name).toBe("gradients-by-f13s");

  const notified = await request.post("/api/mcp", { headers: { Authorization: `Bearer ${key}` }, data: { jsonrpc: "2.0", method: "notifications/initialized" } });
  expect(notified.status()).toBe(202);
  expect((await (await call(request, key, "ping")).json()).result).toEqual({});

  const tools = (await (await call(request, key, "tools/list")).json()).result.tools;
  expect(tools.map((t: { name: string }) => t.name)).toEqual(["list_presets", "list_layers", "create_gradient", "random_gradient"]);
  expect(tools[2]).not.toHaveProperty("metered"); // an internal flag, not part of the protocol

  expect((await tool(request, key, "list_presets")).content[0].text).toContain("Peach Aura");
  expect(init.result.instructions).toContain("Cursor effects");
  expect((await tool(request, key, "list_layers")).content[0].text).toContain('"id":"cursor-light"');

  const made = await tool(request, key, "create_gradient", { layers: [{ type: "mesh", params: { colors: ["#101010", "#ff5500"] } }, { type: "grain" }], seed: 5 });
  expect(made.isError).toBeUndefined();
  const text: string = made.content[0].text;
  expect(text).toContain(`${ORIGIN}/embed.js`);
  const recipe = decodeRecipe(text.match(/\/studio\?g=([A-Za-z0-9_-]+)/)![1]);
  expect(recipe.seed).toBe(5);
  expect(recipe.layers.map((l) => l.type)).toEqual(["mesh", "grain"]);

  // listing is free; creating counts
  expect((await db.query("select count from mcp_usage where user_id = $1", [paidId])).rows[0].count).toBe(1);
});

test("mistakes come back as tool errors and do not use the allowance", async ({ request }) => {
  const key = await dbKey();
  const before = (await db.query("select coalesce(sum(count), 0)::int as n from mcp_usage where user_id = $1", [paidId])).rows[0].n;
  const bad = await tool(request, key, "create_gradient", { preset: "No Such Preset" });
  expect(bad.isError).toBe(true);
  expect(bad.content[0].text).toContain("list_presets");
  expect((await (await call(request, key, "tools/call", { name: "nope" })).json()).error.code).toBe(-32602);
  expect((await (await call(request, key, "no/such/method")).json()).error.code).toBe(-32601);
  expect((await request.post("/api/mcp", { headers: { Authorization: `Bearer ${key}` }, data: "not json" })).status()).toBe(400);
  expect((await db.query("select coalesce(sum(count), 0)::int as n from mcp_usage where user_id = $1", [paidId])).rows[0].n).toBe(before);
});

test("no key, a wrong key, a replaced key and an unpaid account are all refused", async ({ request }) => {
  expect((await call(request, null, "tools/list")).status()).toBe(401); // the session cookie alone is not enough
  expect((await call(request, "gf_wrong", "tools/list")).status()).toBe(401);
  const old = await newKey(request);
  const fresh = await newKey(request);
  expect((await call(request, old, "tools/list")).status()).toBe(401);
  expect((await call(request, fresh, "tools/list")).status()).toBe(200);
  expect((await request.get("/api/mcp")).status()).toBe(405);
  // a key cannot be made from another site
  expect((await request.post("/api/mcp/key", { headers: { Origin: "https://evil.example" } })).status()).toBe(403);

  // an account with a key but no paid purchase (a key left over after a refund, say)
  const unpaid = (await db.query(`insert into users (email) values ('e2e-new-mcp-${Date.now()}@${TEST_EMAIL_DOMAIN}') returning id`)).rows[0].id;
  await db.query("insert into api_keys (key_hash, user_id) values ($1, $2)", [createHash("sha256").update("gf_unpaid_test_key").digest("hex"), unpaid]);
  expect((await call(request, "gf_unpaid_test_key", "tools/list")).status()).toBe(403);
});

test("the monthly limit stops new gradients but not the lists", async ({ request }) => {
  const key = await dbKey();
  await db.query(
    "insert into mcp_usage (user_id, month, count) values ($1, date_trunc('month', now() at time zone 'utc')::date, 499) on conflict (user_id, month) do update set count = 499",
    [paidId],
  );
  expect((await tool(request, key, "random_gradient", { seed: 1 })).isError).toBeUndefined(); // the 500th
  const over = await tool(request, key, "random_gradient", { seed: 2 });
  expect(over.isError).toBe(true);
  expect(over.content[0].text).toContain("500 gradients for this month");
  expect((await db.query("select count from mcp_usage where user_id = $1", [paidId])).rows[0].count).toBe(500); // not pushed past the limit
  expect((await tool(request, key, "list_layers")).isError).toBeUndefined();
  await db.query("delete from mcp_usage where user_id = $1", [paidId]);
});

test("the account page creates a key and shows how to connect", async ({ page }) => {
  await db.query("delete from api_keys where user_id = $1", [paidId]);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "MCP server" })).toBeVisible();
  await expect(page.getByText("You have no key yet.")).toBeVisible();
  await page.getByRole("button", { name: "Create key" }).click();
  const command = page.getByLabel("Claude Code command");
  await expect(command).toContainText(/claude mcp add --transport http gradients http:\/\/localhost:3000\/api\/mcp --header "Authorization: Bearer gf_[A-Za-z0-9_-]{32}"/);
  await expect(page.getByRole("button", { name: "Replace key" })).toBeVisible();
  // the key on screen really works
  const key = (await command.textContent())!.match(/Bearer (gf_[A-Za-z0-9_-]+)/)![1];
  expect((await call(page.request, key, "tools/list")).status()).toBe(200);
});
