import { NextRequest, NextResponse } from "next/server";
import { sendDueReminderPushIfNeeded } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const expected = process.env.PUSH_DEBUG_SECRET ?? process.env.PUSH_CRON_SECRET;
  if (!expected) return true;

  const fromHeader = req.headers.get("x-debug-secret") ?? req.headers.get("x-cron-secret");
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const authorization = req.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  return fromHeader === expected || fromQuery === expected || bearer === expected;
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    const result = await sendDueReminderPushIfNeeded({ force: body.force ?? true });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the test push";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
