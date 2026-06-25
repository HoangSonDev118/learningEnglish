import { NextResponse } from "next/server";
import { resetVocabularyCard } from "@/lib/vocabulary/vocabulary-service";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const card = await resetVocabularyCard(id);
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy từ vựng" }, { status: 404 });
    }
    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể đặt lại từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
