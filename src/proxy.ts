import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session-cookie";

/**
 * Optimistic check only: no session cookie means "not signed in", so send the visitor to sign in before anything
 * renders, keeping where they were going. Whether the cookie is valid, and whether they have paid, is decided by
 * getAccount() in each page.
 */
export function proxy(req: NextRequest) {
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/signin", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/studio/:path*", "/checkout/:path*", "/account/:path*"] };
