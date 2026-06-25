import { NextResponse } from "next/server";
import { deleteVocabularyCard } from "@/lib/vocabulary/vocabulary-service";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu id từ vựng" }, { status: 400 });
    }

    const deleted = await deleteVocabularyCard(id);
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy từ vựng" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xóa từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
