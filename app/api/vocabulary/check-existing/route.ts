import { NextRequest, NextResponse } from "next/server";
import { checkExistingWords } from "@/lib/vocabulary/vocabulary-service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { words?: unknown };
    const words = body.words;

    if (!Array.isArray(words) || words.some((w) => typeof w !== "string")) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const existing = await checkExistingWords(words as string[]);
    return NextResponse.json({ existing });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể kiểm tra từ vựng";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
