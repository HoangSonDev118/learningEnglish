import { ReviewRating, VocabularyCard } from "@/types/vocab";
import { applyReview } from "@/lib/srs/spaced-repetition";

export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:"'()\[\]{}]/g, "");
}

export function isTypingAnswerCorrect(input: string, expected: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(expected);
}

export function applyTypingReview(
  card: VocabularyCard,
  input: string,
  ratingIfCorrect?: Exclude<ReviewRating, "again">
): { updatedCard: VocabularyCard; isCorrect: boolean; resolvedRating: ReviewRating } {
  const isCorrect = isTypingAnswerCorrect(input, card.word);
  const resolvedRating: ReviewRating = isCorrect
    ? ratingIfCorrect ?? "good"
    : "again";

  return {
    updatedCard: applyReview(card, resolvedRating),
    isCorrect,
    resolvedRating,
  };
}
