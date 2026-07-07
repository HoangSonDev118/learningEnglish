export type CardStatus = "new" | "learning" | "review" | "mastered";
export type ReviewMode = "flashcard" | "typing" | "mixed";
export type ReviewType = "flashcard" | "typing";

export type VocabularyCard = {
  id: string;
  word: string;
  partOfSpeech?: string | null;
  meaning: string;
  setIds?: string[];
  setNames?: string[];
  status: CardStatus;
  reviewMode: ReviewMode;
  repetition: number;
  interval: number;
  easeFactor: number;
  lapses: number;
  dueDate: string;
  lastReviewedAt?: string | null;
  typingEnabled?: boolean;
  masteryScore?: number;
  correctCount?: number;
  wrongCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type VocabularySet = {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  coverImagePublicId?: string | null;
  cardCount?: number;
  dueCount?: number;
};

export type VocabularyExample = {
  id: string;
  cardId: string;
  sentence: string;
  translation?: string | null;
  source?: string | null;
  createdAt: string;
};

export type ReviewLog = {
  id: string;
  cardId: string;
  reviewType: ReviewType;
  rating?: ReviewRating | null;
  typedAnswer?: string | null;
  isCorrect?: boolean | null;
  oldRepetition?: number | null;
  newRepetition?: number | null;
  oldInterval?: number | null;
  newInterval?: number | null;
  oldEaseFactor?: number | null;
  newEaseFactor?: number | null;
  reviewedAt: string;
};

export type StudyStats = {
  streak: number;
  lastStudyDate?: string;
  totalReviews: number;
};

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewSessionItem = {
  card: VocabularyCard;
  mode: "flashcard" | "typing";
};

export type ParseResult = {
  validItems: { word: string; meaning: string; partOfSpeech?: string | null }[];
  invalidLines: { lineNumber: number; content: string; reason: string }[];
};

export type ReviewSessionSummary = {
  reviewedCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
};

export type DashboardSummary = {
  totalCards: number;
  newCards: number;
  dueToday: number;
  masteredCards: number;
  learningCards: number;
  reviewCards: number;
  typingEligible: number;
  reviewedToday: number;
  streak: number;
};
