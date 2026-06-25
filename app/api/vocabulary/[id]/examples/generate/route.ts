import { NextRequest, NextResponse } from "next/server";
import { generateExamplesForCard } from "@/lib/vocabulary/vocabulary-service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { forceRefresh?: boolean };
    const examples = await generateExamplesForCard(id, Boolean(body.forceRefresh));
    return NextResponse.json({ examples });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo ví dụ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
