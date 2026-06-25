import { and, asc, count, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  reviewLogs,
  studyStats,
  vocabularyCards,
  vocabularyExamples,
} from "@/db/schema";
import {
  DashboardSummary,
  ReviewRating,
  ReviewSessionItem,
  StudyStats,
  VocabularyCard,
  VocabularyExample,
} from "@/types/vocab";
import { applyReview, createNewCard, isTypingEligible } from "@/lib/srs/spaced-repetition";
import { generateExamplesForWord } from "@/lib/vocabulary/examples-service";
import { todayString } from "@/lib/utils/date";

type CardRow = typeof vocabularyCards.$inferSelect;
type ExampleRow = typeof vocabularyExamples.$inferSelect;

type ImportInput = { word: string; meaning: string };

function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function mapCard(row: CardRow): VocabularyCard {
  return {
    id: row.id,
    word: row.word,
    meaning: row.meaning,
    status: row.status as VocabularyCard["status"],
    reviewMode: row.reviewMode as VocabularyCard["reviewMode"],
    repetition: row.repetition,
    interval: row.interval,
    easeFactor: row.easeFactor,
    lapses: row.lapses,
    dueDate: row.dueDate.toISOString(),
    lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null,
    typingEnabled: row.typingEnabled,
    masteryScore: row.masteryScore,
    correctCount: row.correctCount,
    wrongCount: row.wrongCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapExample(row: ExampleRow): VocabularyExample {
  return {
    id: row.id,
    cardId: row.cardId,
    sentence: row.sentence,
    translation: row.translation,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getOrCreateStatsRow() {
  const db = getDb();
  const rows = await db.select().from(studyStats).limit(1);
  if (rows[0]) return rows[0];

  const inserted = await db
    .insert(studyStats)
    .values({
      streak: 0,
      totalReviews: 0,
      lastStudyDate: null,
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function getStudyStats(): Promise<StudyStats> {
  const row = await getOrCreateStatsRow();
  return {
    streak: row.streak,
    totalReviews: row.totalReviews,
    lastStudyDate: row.lastStudyDate ?? undefined,
  };
}

export async function updateStudyStatsAfterReview() {
  const db = getDb();
  const current = await getOrCreateStatsRow();
  const today = todayString();
  const nextStreak = current.lastStudyDate === today ? current.streak : current.streak + 1;

  await db
    .update(studyStats)
    .set({
      streak: nextStreak,
      totalReviews: current.totalReviews + 1,
      lastStudyDate: today,
      updatedAt: new Date(),
    })
    .where(eq(studyStats.id, current.id));
}

export async function getLibraryCards(): Promise<VocabularyCard[]> {
  const db = getDb();
  const rows = await db.select().from(vocabularyCards).orderBy(desc(vocabularyCards.createdAt));
  return rows.map(mapCard);
}

export type LibraryFilter = "all" | "new" | "learning" | "review" | "mastered" | "due";

export type LibraryPage = {
  cards: VocabularyCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getLibraryCardsPaged(params: {
  page: number;
  pageSize: number;
  search?: string;
  filter?: LibraryFilter;
}): Promise<LibraryPage> {
  const db = getDb();
  const { page, pageSize, search, filter } = params;
  const now = new Date();

  const conditions: ReturnType<typeof eq>[] = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(vocabularyCards.word, term), ilike(vocabularyCards.meaning, term)) as ReturnType<typeof eq>
    );
  }

  if (filter && filter !== "all") {
    if (filter === "due") {
      conditions.push(
        and(lte(vocabularyCards.dueDate, now), ne(vocabularyCards.status, "mastered")) as ReturnType<typeof eq>
      );
    } else {
      conditions.push(eq(vocabularyCards.status, filter) as ReturnType<typeof eq>);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(vocabularyCards)
      .where(where),
    db
      .select()
      .from(vocabularyCards)
      .where(where)
      .orderBy(desc(vocabularyCards.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    cards: rows.map(mapCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function deleteVocabularyCard(cardId: string): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(vocabularyCards)
    .where(eq(vocabularyCards.id, cardId))
    .returning({ id: vocabularyCards.id });

  return deleted.length > 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const cards = await getLibraryCards();
  const stats = await getStudyStats();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const db = getDb();
  const reviewedTodayResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(gte(reviewLogs.reviewedAt, startOfDay));

  const dueToday = cards.filter((c) => new Date(c.dueDate) <= today && c.status !== "mastered").length;

  return {
    totalCards: cards.length,
    newCards: cards.filter((c) => c.status === "new").length,
    dueToday,
    masteredCards: cards.filter((c) => c.status === "mastered").length,
    learningCards: cards.filter((c) => c.status === "learning").length,
    reviewCards: cards.filter((c) => c.status === "review").length,
    typingEligible: cards.filter((c) => isTypingEligible(c)).length,
    reviewedToday: Number(reviewedTodayResult[0]?.count ?? 0),
    streak: stats.streak,
  };
}

export async function importVocabularyItems(items: ImportInput[]) {
  const db = getDb();
  const now = new Date();

  const values = items.map(({ word, meaning }) => {
    const card = createNewCard(word, meaning);
    return {
      id: card.id,
      word: card.word,
      meaning: card.meaning,
      status: card.status,
      reviewMode: card.reviewMode,
      repetition: card.repetition,
      interval: card.interval,
      easeFactor: card.easeFactor,
      lapses: card.lapses,
      dueDate: new Date(card.dueDate),
      lastReviewedAt: null,
      typingEnabled: card.typingEnabled ?? false,
      masteryScore: card.masteryScore ?? 0,
      correctCount: card.correctCount ?? 0,
      wrongCount: card.wrongCount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  });

  try {
    const inserted = await db
      .insert(vocabularyCards)
      .values(values)
      .onConflictDoNothing()
      .returning();

    return {
      insertedCount: inserted.length,
      duplicatesSkipped: items.length - inserted.length,
      cards: inserted.map(mapCard),
    };
  } catch (error) {
    // Fallback strategy: if bulk insert fails for any row-level issue,
    // retry row by row so valid rows can still be imported.
    const insertedRows: CardRow[] = [];

    for (const value of values) {
      try {
        const row = await db
          .insert(vocabularyCards)
          .values(value)
          .onConflictDoNothing()
          .returning();
        if (row[0]) insertedRows.push(row[0]);
      } catch {
        // Skip broken rows in fallback mode.
      }
    }

    if (insertedRows.length === 0) {
      const message = error instanceof Error ? error.message : "Failed to import vocabulary";
      throw new Error(`Failed to import vocabulary: ${message}`);
    }

    return {
      insertedCount: insertedRows.length,
      duplicatesSkipped: items.length - insertedRows.length,
      cards: insertedRows.map(mapCard),
    };
  }
}

export async function getDueSessionItems(): Promise<ReviewSessionItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vocabularyCards)
    .where(and(lte(vocabularyCards.dueDate, new Date()), ne(vocabularyCards.status, "mastered")))
    .orderBy(
      asc(
        sql`case
          when ${vocabularyCards.status} = 'learning' then 0
          when ${vocabularyCards.status} = 'review' then 1
          else 2
        end`
      ),
      asc(vocabularyCards.dueDate)
    );

  const cards = shuffleArray(rows.map(mapCard));
  const typingCandidates = shuffleArray(cards.filter((c) => isTypingEligible(c)));
  const typingQuota = Math.max(0, Math.floor(cards.length * 0.3));
  const typingSet = new Set(typingCandidates.slice(0, typingQuota).map((c) => c.id));

  return cards.map((card) => ({
    card,
    mode: typingSet.has(card.id) ? "typing" : "flashcard",
  }));
}

export async function submitFlashcardReview(input: {
  cardId: string;
  rating: ReviewRating;
}) {
  const db = getDb();
  const row = await db.select().from(vocabularyCards).where(eq(vocabularyCards.id, input.cardId)).limit(1);
  const existing = row[0];
  if (!existing) throw new Error("Card not found");

  const before = mapCard(existing);
  const after = applyReview(before, input.rating);

  const updatedRows = await db
    .update(vocabularyCards)
    .set({
      status: after.status,
      reviewMode: after.reviewMode,
      repetition: after.repetition,
      interval: after.interval,
      easeFactor: after.easeFactor,
      lapses: after.lapses,
      dueDate: new Date(after.dueDate),
      lastReviewedAt: after.lastReviewedAt ? new Date(after.lastReviewedAt) : null,
      typingEnabled: after.typingEnabled ?? false,
      masteryScore: after.masteryScore ?? 0,
      correctCount: after.correctCount ?? 0,
      wrongCount: after.wrongCount ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyCards.id, input.cardId))
    .returning();

  await db.insert(reviewLogs).values({
    cardId: input.cardId,
    reviewType: "flashcard",
    rating: input.rating,
    typedAnswer: null,
    isCorrect: null,
    oldRepetition: before.repetition,
    newRepetition: after.repetition,
    oldInterval: before.interval,
    newInterval: after.interval,
    oldEaseFactor: before.easeFactor,
    newEaseFactor: after.easeFactor,
    reviewedAt: new Date(),
  });

  await updateStudyStatsAfterReview();
  return mapCard(updatedRows[0]);
}

export async function submitTypingReview(input: {
  cardId: string;
  typedAnswer: string;
  isCorrect: boolean;
  ratingIfCorrect?: Exclude<ReviewRating, "again">;
}) {
  const db = getDb();
  const row = await db.select().from(vocabularyCards).where(eq(vocabularyCards.id, input.cardId)).limit(1);
  const existing = row[0];
  if (!existing) throw new Error("Card not found");

  const before = mapCard(existing);
  const resolvedRating: ReviewRating = input.isCorrect
    ? input.ratingIfCorrect ?? "good"
    : "again";
  const after = applyReview(before, resolvedRating);

  const updatedRows = await db
    .update(vocabularyCards)
    .set({
      status: after.status,
      reviewMode: after.reviewMode,
      repetition: after.repetition,
      interval: after.interval,
      easeFactor: after.easeFactor,
      lapses: after.lapses,
      dueDate: new Date(after.dueDate),
      lastReviewedAt: after.lastReviewedAt ? new Date(after.lastReviewedAt) : null,
      typingEnabled: after.typingEnabled ?? false,
      masteryScore: after.masteryScore ?? 0,
      correctCount: after.correctCount ?? 0,
      wrongCount: after.wrongCount ?? 0,
      updatedAt: new Date(),
    })
    .where(eq(vocabularyCards.id, input.cardId))
    .returning();

  await db.insert(reviewLogs).values({
    cardId: input.cardId,
    reviewType: "typing",
    rating: resolvedRating,
    typedAnswer: input.typedAnswer,
    isCorrect: input.isCorrect,
    oldRepetition: before.repetition,
    newRepetition: after.repetition,
    oldInterval: before.interval,
    newInterval: after.interval,
    oldEaseFactor: before.easeFactor,
    newEaseFactor: after.easeFactor,
    reviewedAt: new Date(),
  });

  await updateStudyStatsAfterReview();
  return { card: mapCard(updatedRows[0]), resolvedRating };
}

export async function getExamplesForCard(cardId: string): Promise<VocabularyExample[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(vocabularyExamples)
    .where(eq(vocabularyExamples.cardId, cardId))
    .orderBy(asc(vocabularyExamples.createdAt));
  return rows.map(mapExample);
}

export async function generateExamplesForCard(cardId: string, forceRefresh = false) {
  const db = getDb();
  const cardRows = await db.select().from(vocabularyCards).where(eq(vocabularyCards.id, cardId)).limit(1);
  const card = cardRows[0];
  if (!card) throw new Error("Card not found");

  if (forceRefresh) {
    await db.delete(vocabularyExamples).where(eq(vocabularyExamples.cardId, cardId));
  } else {
    const existing = await getExamplesForCard(cardId);
    if (existing.length > 0) return existing;
  }

  const generated = await generateExamplesForWord(card.word, card.meaning);
  const inserted = await db
    .insert(vocabularyExamples)
    .values(
      generated.map((item) => ({
        cardId,
        sentence: item.sentence,
        translation: item.translation,
        source: item.source,
        createdAt: new Date(),
      }))
    )
    .returning();

  return inserted.map(mapExample);
}

export async function importLegacyData(input: {
  cards: VocabularyCard[];
  stats?: StudyStats | null;
}) {
  const imported = await importVocabularyItems(
    input.cards.map((c) => ({ word: c.word, meaning: c.meaning }))
  );

  if (input.stats) {
    const db = getDb();
    const row = await getOrCreateStatsRow();
    await db
      .update(studyStats)
      .set({
        streak: Math.max(row.streak, input.stats.streak),
        totalReviews: Math.max(row.totalReviews, input.stats.totalReviews),
        lastStudyDate: input.stats.lastStudyDate ?? row.lastStudyDate,
        updatedAt: new Date(),
      })
      .where(eq(studyStats.id, row.id));
  }

  return imported;
}
