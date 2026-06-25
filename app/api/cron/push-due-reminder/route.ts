import { NextRequest, NextResponse } from "next/server";
import { sendDueReminderPushIfNeeded } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest) {
  const expected = process.env.PUSH_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!expected) return true;

  const fromHeader = req.headers.get("x-cron-secret");
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

    const result = await sendDueReminderPushIfNeeded();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi push nhắc ôn tập";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
