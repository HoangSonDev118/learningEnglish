import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/vocabulary/vocabulary-service";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải dữ liệu tổng quan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
