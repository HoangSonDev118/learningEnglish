import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Thiếu endpoint" }, { status: 400 });
    }

    await removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể hủy đăng ký push";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
