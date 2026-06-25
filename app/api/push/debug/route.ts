import { NextRequest, NextResponse } from "next/server";
import { getPushDebugStatus } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const expected =
    process.env.PUSH_DEBUG_SECRET ?? process.env.PUSH_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!expected) return true;

  const fromHeader = req.headers.get("x-debug-secret") ?? req.headers.get("x-cron-secret");
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const authorization = req.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  return fromHeader === expected || fromQuery === expected || bearer === expected;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getPushDebugStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the debug push";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
