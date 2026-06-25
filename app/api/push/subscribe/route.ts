import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

type SubscribeBody = {
  subscription?: {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubscribeBody;
    const subscription = body.subscription;

    if (
      !subscription?.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json({ error: "Subscription không hợp lệ" }, { status: 400 });
    }

    await savePushSubscription(
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      req.headers.get("user-agent") ?? undefined
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể đăng ký push";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
