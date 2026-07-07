import { ReviewRating, VocabularyCard } from "@/types/vocab";
import { applyReview } from "@/lib/srs/spaced-repetition";

export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:"'()\[\]{}]/g, "");
}

function stripTrailingPartOfSpeech(word: string): string {
  return word.replace(/\s*\([^()]+\)\s*$/, "").trim();
}

export function isTypingAnswerCorrect(input: string, expected: string): boolean {
  const normalizedInput = normalizeAnswer(input);
  const normalizedExpected = normalizeAnswer(expected);
  const normalizedExpectedWithoutPos = normalizeAnswer(stripTrailingPartOfSpeech(expected));
  return (
    normalizedInput === normalizedExpected ||
    normalizedInput === normalizedExpectedWithoutPos
  );
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
