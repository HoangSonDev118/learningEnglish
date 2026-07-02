import { NextRequest, NextResponse } from "next/server";
import { deleteVocabularySet, renameVocabularySet } from "@/lib/vocabulary/vocabulary-service";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim() ?? "";

    if (!id || !name) {
      return NextResponse.json({ error: "Thiếu thông tin bộ từ" }, { status: 400 });
    }

    const updated = await renameVocabularySet(id, name);
    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy bộ từ" }, { status: 404 });
    }

    return NextResponse.json({ set: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể đổi tên bộ từ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Thiếu id bộ từ" }, { status: 400 });
    }

    const deleted = await deleteVocabularySet(id);
    if (!deleted) {
      return NextResponse.json({ error: "Không tìm thấy bộ từ" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể xóa bộ từ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
