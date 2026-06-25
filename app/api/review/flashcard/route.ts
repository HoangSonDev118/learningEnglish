import { NextRequest, NextResponse } from "next/server";
import { submitFlashcardReview } from "@/lib/vocabulary/vocabulary-service";
import { ReviewRating } from "@/types/vocab";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { cardId?: string; rating?: ReviewRating };
    if (!body.cardId || !body.rating) {
      return NextResponse.json({ error: "Can cardId va rating" }, { status: 400 });
    }

    const card = await submitFlashcardReview({
      cardId: body.cardId,
      rating: body.rating,
    });

    return NextResponse.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Khong the gui ket qua on tap the";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
