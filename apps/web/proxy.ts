import { NextResponse, type NextRequest } from "next/server";

/**
 * Requests to /api/* are forwarded to the backend by the rewrite in next.config.ts. Without help, the backend would see
 * this server's address for every visitor, so per-visitor limits (sign-in attempts, contact form) would be shared by
 * everyone. Pass the visitor's IP along with a secret the backend checks (PROXY_SECRET, set on both).
 */
export function proxy(request: NextRequest) {
  const secret = process.env.PROXY_SECRET;
  const headers = new Headers(request.headers);
  // Never let a visitor supply these themselves.
  headers.delete("x-mgk-proxy-secret");
  headers.delete("x-mgk-client-ip");
  if (secret) {
    // On Vercel, x-real-ip / x-forwarded-for are set by the platform from the actual connection.
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) {
      headers.set("x-mgk-proxy-secret", secret);
      headers.set("x-mgk-client-ip", ip);
    }
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: "/api/:path*" };
