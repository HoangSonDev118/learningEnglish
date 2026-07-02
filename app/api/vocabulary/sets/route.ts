import { NextResponse } from "next/server";
import { getVocabularySets } from "@/lib/vocabulary/vocabulary-service";

export async function GET() {
  try {
    const sets = await getVocabularySets();
    return NextResponse.json({ sets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải bộ từ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
