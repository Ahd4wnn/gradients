import { callTool, MCP_INSTRUCTIONS, MCP_MONTHLY_LIMIT, MCP_TOOLS, ToolError } from "@/lib/mcp";
import { apiKeyAccount, takeMcpUse } from "@/lib/server/apikey";
import { rateLimited } from "@/lib/server/guard";

/**
 * Model Context Protocol server, "Streamable HTTP" transport in its simplest form: every JSON-RPC request is one POST
 * answered with one JSON body. No sessions and no server-sent stream, because every tool answers at once.
 * Auth is a bearer API key (not the session cookie), so there is no cross-site request to guard against.
 */
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const headers = { "Cache-Control": "no-store" };
const rpc = (id: unknown, body: object, status = 200) => Response.json({ jsonrpc: "2.0", id: id ?? null, ...body }, { status, headers });
const rpcError = (id: unknown, code: number, message: string, status = 200) => rpc(id, { error: { code, message } }, status);

// ponytail: trusts the proxy's forwarded headers for the public address; set a fixed site URL here if the host ever sits behind an untrusted proxy.
function siteOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export async function POST(req: Request) {
  const key = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const account = key ? await apiKeyAccount(key) : null;
  if (!account) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Missing or unknown API key. Create one on your account page." } }, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } });
  if (!account.pro) return rpcError(null, -32002, "This account has no licence. The MCP server comes with lifetime access.", 403);
  if (rateLimited(`mcp:${account.id}`, 120, 60_000)) return rpcError(null, -32003, "Too many requests. Wait a minute.", 429);

  const msg = await req.json().catch(() => null);
  if (!msg || typeof msg !== "object" || Array.isArray(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return rpcError(null, -32600, "Expected one JSON-RPC 2.0 request.", 400);
  const { id, method, params } = msg as { id?: unknown; method: string; params?: Record<string, unknown> };
  // notifications (no id) get no body
  if (id === undefined || id === null) return new Response(null, { status: 202, headers });

  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      return rpc(id, {
        result: {
          protocolVersion: typeof asked === "string" && VERSIONS.includes(asked) ? asked : VERSIONS[0],
          capabilities: { tools: {} },
          serverInfo: { name: "gradients-by-f13s", version: "1.0.0" },
          instructions: MCP_INSTRUCTIONS,
        },
      });
    }
    case "ping":
      return rpc(id, { result: {} });
    case "tools/list":
      return rpc(id, { result: { tools: MCP_TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
    case "tools/call": {
      const tool = MCP_TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(params?.name)}`);
      const fail = (text: string) => rpc(id, { result: { content: [{ type: "text", text }], isError: true } });
      try {
        // run first, charge after: a call the agent got wrong does not use up the allowance
        const text = callTool(tool.name, params?.arguments, siteOrigin(req));
        if (tool.metered && !(await takeMcpUse(account.id, MCP_MONTHLY_LIMIT)))
          return fail(`This account has used all ${MCP_MONTHLY_LIMIT} gradients for this month. The allowance resets on the 1st (UTC). The studio has no limit.`);
        return rpc(id, { result: { content: [{ type: "text", text }] } });
      } catch (e) {
        if (e instanceof ToolError) return fail(e.message);
        throw e;
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

// This server never opens a stream; the spec's answer for that is 405.
export const GET = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
