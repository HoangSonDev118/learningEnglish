import { NextRequest, NextResponse } from "next/server";
import { importVocabularyItems } from "@/lib/vocabulary/vocabulary-service";
import { sendDueReminderPushIfNeeded } from "@/lib/notifications/web-push";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: { word: string; meaning: string }[] };
    const items = body.items ?? [];

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
    }

    const sanitized = items
      .map((item) => ({ word: item.word?.trim(), meaning: item.meaning?.trim() }))
      .filter((item) => item.word && item.meaning) as { word: string; meaning: string }[];

    const result = await importVocabularyItems(sanitized);

    void sendDueReminderPushIfNeeded();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể nhập từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
