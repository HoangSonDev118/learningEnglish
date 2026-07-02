import { NextRequest, NextResponse } from "next/server";
import { importVocabularyItems } from "@/lib/vocabulary/vocabulary-service";
import { sendDueReminderPushIfNeeded } from "@/lib/notifications/web-push";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      items?: { word: string; meaning: string }[];
      setIds?: string[];
      newSetNames?: string[];
      newSetCovers?: {
        name?: string;
        coverImageUrl?: string;
        coverImagePublicId?: string;
      }[];
    };
    const items = body.items ?? [];
    const setIds = Array.isArray(body.setIds) ? body.setIds : [];
    const newSetNames = Array.isArray(body.newSetNames) ? body.newSetNames : [];
    const newSetCovers = Array.isArray(body.newSetCovers)
      ? body.newSetCovers
          .map((item) => ({
            name: item.name?.trim() ?? "",
            coverImageUrl: item.coverImageUrl?.trim() ?? "",
            coverImagePublicId: item.coverImagePublicId?.trim() ?? "",
          }))
          .filter((item) => item.name && item.coverImageUrl && item.coverImagePublicId)
      : [];

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ" }, { status: 400 });
    }

    if (setIds.length === 0 && newSetNames.length === 0) {
      return NextResponse.json(
        { error: "Bạn cần chọn ít nhất 1 bộ từ hoặc nhập tên bộ từ mới" },
        { status: 400 }
      );
    }

    const sanitized = items
      .map((item) => ({ word: item.word?.trim(), meaning: item.meaning?.trim() }))
      .filter((item) => item.word && item.meaning) as { word: string; meaning: string }[];

    const result = await importVocabularyItems(sanitized, { setIds, newSetNames, newSetCovers });

    void sendDueReminderPushIfNeeded();

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể nhập từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
