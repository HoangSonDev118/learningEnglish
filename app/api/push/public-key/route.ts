import { NextResponse } from "next/server";
import { getWebPushPublicKey } from "@/lib/notifications/web-push";

export const runtime = "nodejs";

export async function GET() {
  const publicKey = getWebPushPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: "Web Push chưa được cấu hình trên server" },
      { status: 503 }
    );
  }

  return NextResponse.json({ publicKey });
}
