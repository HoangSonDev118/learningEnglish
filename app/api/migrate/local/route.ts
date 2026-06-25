import { NextRequest, NextResponse } from "next/server";
import { importLegacyData } from "@/lib/vocabulary/vocabulary-service";
import { StudyStats, VocabularyCard } from "@/types/vocab";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      cards?: VocabularyCard[];
      stats?: StudyStats | null;
    };

    const cards = Array.isArray(body.cards) ? body.cards : [];
    const result = await importLegacyData({ cards, stats: body.stats ?? null });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the chuyen du lieu local";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
