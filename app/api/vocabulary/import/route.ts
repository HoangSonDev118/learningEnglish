import { NextRequest, NextResponse } from "next/server";
import { importVocabularyItems } from "@/lib/vocabulary/vocabulary-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items?: { word: string; meaning: string }[] };
    const items = body.items ?? [];

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Du lieu gui len khong hop le" }, { status: 400 });
    }

    const sanitized = items
      .map((item) => ({ word: item.word?.trim(), meaning: item.meaning?.trim() }))
      .filter((item) => item.word && item.meaning) as { word: string; meaning: string }[];

    const result = await importVocabularyItems(sanitized);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the nhap tu vung";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
