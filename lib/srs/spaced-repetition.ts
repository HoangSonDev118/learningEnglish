import { VocabularyCard, ReviewRating, CardStatus, ReviewMode } from "@/types/vocab";
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
    reviewMode: "flashcard",
    repetition: 0,
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    lapses: 0,
    dueDate: now,
    typingEnabled: false,
    masteryScore: 0,
    correctCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function isTypingEligible(card: VocabularyCard): boolean {
  return Boolean(card.typingEnabled) || card.repetition >= 4 || card.status === "mastered";
}

function computeMasteryScore(card: VocabularyCard): number {
  const correctCount = card.correctCount ?? 0;
  const wrongCount = card.wrongCount ?? 0;
  const repetitionScore = card.repetition * 12;
  const intervalScore = Math.min(card.interval, 30) * 2;
  const accuracyScore = Math.max(0, correctCount * 3 - wrongCount * 2);
  return Math.max(0, Math.min(100, repetitionScore + intervalScore + accuracyScore));
}

const MASTERED_RECHECK_DAYS = 30;

export function applyReview(
  card: VocabularyCard,
  rating: ReviewRating
): VocabularyCard {
  const now = new Date().toISOString();
  let { repetition, interval, easeFactor, lapses } = card;
  let status: CardStatus = "review";
  let dueDate: string;

  // Special handling for mastered cards during periodic recheck.
  if (card.status === "mastered") {
    if (rating === "again" || rating === "hard") {
      // Forgotten — demote back to active review.
      return {
        ...card,
        status: "review",
        repetition: Math.max(4, card.repetition - 2),
        interval: 7,
        lapses: lapses + 1,
        easeFactor: Math.max(MIN_EASE_FACTOR, easeFactor - 0.2),
        dueDate: addDaysToNow(7),
        lastReviewedAt: now,
        updatedAt: now,
        wrongCount: (card.wrongCount ?? 0) + 1,
      };
    } else {
      // Still remembered — keep mastered, push due date out another 30 days.
      return {
        ...card,
        status: "mastered",
        dueDate: addDaysToNow(MASTERED_RECHECK_DAYS),
        lastReviewedAt: now,
        updatedAt: now,
        correctCount: (card.correctCount ?? 0) + 1,
      };
    }
  }

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
    dueDate = addDaysToNow(MASTERED_RECHECK_DAYS);
  }

  const base: VocabularyCard = {
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

  const nextTypingEnabled = isTypingEligible(base);
  const nextReviewMode: ReviewMode = nextTypingEnabled ? "mixed" : "flashcard";
  const nextCorrectCount = (card.correctCount ?? 0) + (rating === "again" ? 0 : 1);
  const nextWrongCount = (card.wrongCount ?? 0) + (rating === "again" ? 1 : 0);

  return {
    ...base,
    reviewMode: nextReviewMode,
    typingEnabled: nextTypingEnabled,
    correctCount: nextCorrectCount,
    wrongCount: nextWrongCount,
    masteryScore: computeMasteryScore({
      ...base,
      correctCount: nextCorrectCount,
      wrongCount: nextWrongCount,
    }),
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
