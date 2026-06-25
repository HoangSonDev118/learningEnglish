import { VocabularyCard, ReviewRating, CardStatus } from "@/types/vocab";
import { addDaysToNow, addMinutesToNow } from "@/lib/utils/date";

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const MASTERED_THRESHOLD = 8;

export function createNewCard(word: string, meaning: string): VocabularyCard {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    word,
    meaning,
    status: "new",
    repetition: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    lapses: 0,
    dueDate: now,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyReview(
  card: VocabularyCard,
  rating: ReviewRating
): VocabularyCard {
  const now = new Date().toISOString();
  let { repetition, interval, easeFactor, lapses } = card;
  let status: CardStatus = "review";
  let dueDate: string;

  switch (rating) {
    case "again":
      repetition = 0;
      interval = 0;
      lapses += 1;
      status = "learning";
      dueDate = addMinutesToNow(10);
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
      break;

    case "hard":
      repetition += 1;
      if (repetition === 1) interval = 1;
      else if (repetition === 2) interval = 3;
      else interval = Math.round(interval * 1.2);
      status = "review";
      dueDate = addDaysToNow(interval);
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.05);
      break;

    case "good":
      repetition += 1;
      if (repetition === 1) interval = 1;
      else if (repetition === 2) interval = 3;
      else interval = Math.round(interval * easeFactor);
      status = "review";
      dueDate = addDaysToNow(interval);
      break;

    case "easy":
      repetition += 1;
      if (repetition === 1) interval = 3;
      else if (repetition === 2) interval = 7;
      else interval = Math.round(interval * (easeFactor + 0.3));
      easeFactor = Math.min(easeFactor + 0.1, 4.0);
      status = "review";
      dueDate = addDaysToNow(interval);
      break;
  }

  if (repetition >= MASTERED_THRESHOLD) {
    status = "mastered";
  }

  return {
    ...card,
    repetition,
    interval,
    easeFactor,
    lapses,
    status,
    dueDate,
    lastReviewedAt: now,
    updatedAt: now,
  };
}

export function getDueCards(cards: VocabularyCard[]): VocabularyCard[] {
  const now = new Date();
  const due = cards.filter(
    (c) => c.status !== "mastered" && new Date(c.dueDate) <= now
  );

  // Sort: learning first, then review, then new
  const priority: Record<CardStatus, number> = {
    learning: 0,
    review: 1,
    new: 2,
    mastered: 3,
  };

  return due.sort((a, b) => priority[a.status] - priority[b.status]);
}
