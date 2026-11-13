import { json, sameOrigin } from "@/lib/server/guard";
import { endSession } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Bad request." }, 403);
  await endSession();
  return json({ ok: true });
}
