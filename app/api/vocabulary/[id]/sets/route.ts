import { NextRequest, NextResponse } from "next/server";
import { updateVocabularyCardSets } from "@/lib/vocabulary/vocabulary-service";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { setIds?: string[] };
    const setIds = Array.isArray(body.setIds) ? body.setIds : [];

    if (!id) {
      return NextResponse.json({ error: "Thiếu id từ vựng" }, { status: 400 });
    }

    if (setIds.length === 0) {
      return NextResponse.json({ error: "Mỗi từ phải thuộc ít nhất 1 bộ từ" }, { status: 400 });
    }

    const card = await updateVocabularyCardSets(id, setIds);
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy từ vựng" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể cập nhật bộ từ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
