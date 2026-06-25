import { NextRequest, NextResponse } from "next/server";
import { submitTypingReview } from "@/lib/vocabulary/vocabulary-service";
import { ReviewRating } from "@/types/vocab";
import { isTypingAnswerCorrect } from "@/lib/srs/typing-review";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      cardId?: string;
      typedAnswer?: string;
      ratingIfCorrect?: Exclude<ReviewRating, "again">;
      expectedWord?: string;
    };

    if (!body.cardId || body.typedAnswer === undefined || !body.expectedWord) {
      return NextResponse.json(
        { error: "Cần cardId, typedAnswer và expectedWord" },
        { status: 400 }
      );
    }

    const isCorrect = isTypingAnswerCorrect(body.typedAnswer, body.expectedWord);
    const result = await submitTypingReview({
      cardId: body.cardId,
      typedAnswer: body.typedAnswer,
      isCorrect,
      ratingIfCorrect: body.ratingIfCorrect,
    });

    return NextResponse.json({
      card: result.card,
      isCorrect,
      resolvedRating: result.resolvedRating,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi kết quả ôn tập gõ lại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
