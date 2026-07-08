import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

export function getRequestIpHash(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const secret = process.env.IP_HASH_SECRET ?? "development";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

export function getRequestOrigin(request: NextRequest) {
  const configured = process.env.APP_BASE_URL;

  if (configured) {
    return configured;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}
