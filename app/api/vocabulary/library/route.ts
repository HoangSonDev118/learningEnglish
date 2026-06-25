import { NextResponse } from "next/server";
import { getLibraryCards } from "@/lib/vocabulary/vocabulary-service";

export async function GET() {
  try {
    const cards = await getLibraryCards();
    return NextResponse.json({ cards });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải thư viện";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
