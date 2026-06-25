export type CardStatus = "new" | "learning" | "review" | "mastered";

export type VocabularyCard = {
  id: string;
  word: string;
  meaning: string;
  status: CardStatus;
  repetition: number;
  interval: number;
  easeFactor: number;
  lapses: number;
  dueDate: string;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type StudyStats = {
  streak: number;
  lastStudyDate?: string;
  totalReviews: number;
};

export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ParseResult = {
  validItems: { word: string; meaning: string }[];
  invalidLines: { lineNumber: number; content: string; reason: string }[];
};

export type ReviewSessionSummary = {
  reviewedCount: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
};
