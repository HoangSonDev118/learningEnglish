import { NextRequest, NextResponse } from "next/server";
import { getLibraryCardsPaged, LibraryFilter } from "@/lib/vocabulary/vocabulary-service";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? String(PAGE_SIZE), 10)));
    const search = searchParams.get("search") ?? "";
    const filter = (searchParams.get("filter") ?? "all") as LibraryFilter;

    const result = await getLibraryCardsPaged({ page, pageSize, search, filter });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải thư viện";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
