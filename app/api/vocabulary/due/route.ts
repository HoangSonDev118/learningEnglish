import { NextResponse } from "next/server";
import { getDueSessionItems, getRandomLibrarySessionItems } from "@/lib/vocabulary/vocabulary-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") ?? "due";
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "30", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 30;

    const items =
      mode === "library-random"
        ? await getRandomLibrarySessionItems(limit)
        : await getDueSessionItems();

    return NextResponse.json({ items, dueCount: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải thẻ đến hạn";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
