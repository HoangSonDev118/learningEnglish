import { NextRequest, NextResponse } from "next/server";
import { checkExistingWords, checkExistingWordsInSets } from "@/lib/vocabulary/vocabulary-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { words?: unknown; setIds?: unknown };
    const words = body.words;
    const setIds = body.setIds;

    if (!Array.isArray(words) || words.some((w) => typeof w !== "string")) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    if (
      setIds !== undefined &&
      (!Array.isArray(setIds) || setIds.some((id) => typeof id !== "string"))
    ) {
      return NextResponse.json({ error: "Dữ liệu bộ từ không hợp lệ" }, { status: 400 });
    }

    const existing = Array.isArray(setIds)
      ? await checkExistingWordsInSets(words as string[], setIds as string[])
      : await checkExistingWords(words as string[]);

    return NextResponse.json({ existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể kiểm tra từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
