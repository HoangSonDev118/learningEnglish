import { NextResponse } from "next/server";
import { getDueSessionItems } from "@/lib/vocabulary/vocabulary-service";

export async function GET() {
  try {
    const items = await getDueSessionItems();
    return NextResponse.json({ items, dueCount: items.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the tai the den han";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
