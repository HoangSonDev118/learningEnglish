import { NextResponse } from "next/server";
import { getExamplesForCard } from "@/lib/vocabulary/vocabulary-service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const examples = await getExamplesForCard(id);
    return NextResponse.json({ examples });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the tai vi du";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
