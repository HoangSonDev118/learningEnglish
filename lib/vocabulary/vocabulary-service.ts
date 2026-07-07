import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  reviewLogs,
  studyStats,
  vocabularyCardSets,
  vocabularyCards,
  vocabularySets,
} from "@/db/schema";
import {
  DashboardSummary,
  ReviewRating,
  ReviewSessionItem,
  StudyStats,
  VocabularyCard,
  VocabularySet,
} from "@/types/vocab";
import { applyReview, createNewCard, isTypingEligible } from "@/lib/srs/spaced-repetition";
import { todayString } from "@/lib/utils/date";

type CardRow = typeof vocabularyCards.$inferSelect;
type SetRow = typeof vocabularySets.$inferSelect;

type ImportInput = { word: string; meaning: string; partOfSpeech?: string | null };

type ImportOptions = {
  setIds?: string[];
  newSetNames?: string[];
  newSetCovers?: {
    name: string;
    coverImageUrl: string;
    coverImagePublicId: string;
  }[];
};

type CardSetLinkRow = {
  cardId: string;
  setId: string;
  setName: string;
};

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
    partOfSpeech: row.partOfSpeech ?? null,
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

async function enrichCardsWithSets(cards: VocabularyCard[]): Promise<VocabularyCard[]> {
  if (cards.length === 0) return cards;

  const db = getDb();
  const cardIds = cards.map((card) => card.id);
  const links = await db
    .select({
      cardId: vocabularyCardSets.cardId,
      setId: vocabularySets.id,
      setName: vocabularySets.name,
    })
    .from(vocabularyCardSets)
    .innerJoin(vocabularySets, eq(vocabularyCardSets.setId, vocabularySets.id))
    .where(inArray(vocabularyCardSets.cardId, cardIds));

  const grouped = new Map<string, CardSetLinkRow[]>();
  links.forEach((row) => {
    const list = grouped.get(row.cardId) ?? [];
    list.push(row);
    grouped.set(row.cardId, list);
  });

  return cards.map((card) => {
    const cardSets = grouped.get(card.id) ?? [];
    return {
      ...card,
      setIds: cardSets.map((item) => item.setId),
      setNames: cardSets.map((item) => item.setName),
    };
  });
}

function mapSet(row: SetRow & { cardCount?: number; dueCount?: number }): VocabularySet {
  return {
    id: row.id,
    name: row.name,
    coverImageUrl: row.coverImageUrl ?? null,
    coverImagePublicId: row.coverImagePublicId ?? null,
    cardCount: Number(row.cardCount ?? 0),
    dueCount: Number(row.dueCount ?? 0),
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
  return enrichCardsWithSets(rows.map(mapCard));
}

export async function getVocabularySets(): Promise<VocabularySet[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: vocabularySets.id,
      name: vocabularySets.name,
      coverImageUrl: vocabularySets.coverImageUrl,
      coverImagePublicId: vocabularySets.coverImagePublicId,
      createdAt: vocabularySets.createdAt,
      updatedAt: vocabularySets.updatedAt,
      cardCount: count(vocabularyCardSets.cardId),
      dueCount:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.dueDate} <= NOW() THEN 1 ELSE 0 END), 0)`,
    })
    .from(vocabularySets)
    .leftJoin(vocabularyCardSets, eq(vocabularySets.id, vocabularyCardSets.setId))
    .leftJoin(vocabularyCards, eq(vocabularyCardSets.cardId, vocabularyCards.id))
    .groupBy(
      vocabularySets.id,
      vocabularySets.name,
      vocabularySets.coverImageUrl,
      vocabularySets.coverImagePublicId,
      vocabularySets.createdAt,
      vocabularySets.updatedAt
    )
    .orderBy(asc(vocabularySets.createdAt), asc(vocabularySets.name));

  return rows.map(mapSet);
}

async function resolveImportSetIds(options?: ImportOptions): Promise<string[]> {
  const db = getDb();
  const trimmedSetIds = (options?.setIds ?? []).map((id) => id.trim()).filter(Boolean);
  const trimmedNewSetNames = (options?.newSetNames ?? [])
    .map((name) => name.trim())
    .filter(Boolean);
  const newSetCovers = (options?.newSetCovers ?? [])
    .map((item) => ({
      name: item.name.trim(),
      coverImageUrl: item.coverImageUrl.trim(),
      coverImagePublicId: item.coverImagePublicId.trim(),
    }))
    .filter((item) => item.name && item.coverImageUrl && item.coverImagePublicId);

  const resolvedSetIds = new Set<string>();

  if (trimmedSetIds.length > 0) {
    const existingSets = await db
      .select({ id: vocabularySets.id })
      .from(vocabularySets)
      .where(inArray(vocabularySets.id, Array.from(new Set(trimmedSetIds))));
    existingSets.forEach((item) => resolvedSetIds.add(item.id));
  }

  if (trimmedNewSetNames.length > 0) {
    const now = new Date();
    const dedupedNames = Array.from(new Set(trimmedNewSetNames));
    const coverMap = new Map(
      newSetCovers.map((item) => [item.name.toLowerCase(), item])
    );

    await db
      .insert(vocabularySets)
      .values(
        dedupedNames.map((name) => {
          const cover = coverMap.get(name.toLowerCase());
          return {
            name,
            coverImageUrl: cover?.coverImageUrl ?? null,
            coverImagePublicId: cover?.coverImagePublicId ?? null,
            createdAt: now,
            updatedAt: now,
          };
        })
      )
      .onConflictDoNothing();

    const insertedOrExisting = await db
      .select({ id: vocabularySets.id, name: vocabularySets.name })
      .from(vocabularySets)
      .where(
        sql`LOWER(${vocabularySets.name}) = ANY(ARRAY[${sql.join(
          dedupedNames.map((name) => sql`${name.toLowerCase()}`),
          sql`, `
        )}])`
      );
    insertedOrExisting.forEach((item) => resolvedSetIds.add(item.id));
  }

  return Array.from(resolvedSetIds);
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
  setId?: string;
}): Promise<LibraryPage> {
  const db = getDb();
  const { page, pageSize, search, filter, setId } = params;
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
  const setWhere = setId
    ? where
      ? and(where, eq(vocabularyCardSets.setId, setId))
      : eq(vocabularyCardSets.setId, setId)
    : undefined;

  const [totalResult, rows] = setId
    ? await Promise.all([
        db
          .select({ count: count() })
          .from(vocabularyCards)
          .innerJoin(vocabularyCardSets, eq(vocabularyCards.id, vocabularyCardSets.cardId))
          .where(setWhere),
        db
          .select({ card: vocabularyCards })
          .from(vocabularyCards)
          .innerJoin(vocabularyCardSets, eq(vocabularyCards.id, vocabularyCardSets.cardId))
          .where(setWhere)
          .orderBy(desc(vocabularyCards.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ])
    : await Promise.all([
        db
          .select({ count: count() })
          .from(vocabularyCards)
          .where(where),
        db
          .select({ card: vocabularyCards })
          .from(vocabularyCards)
          .where(where)
          .orderBy(desc(vocabularyCards.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
      ]);

  const total = Number(totalResult[0]?.count ?? 0);
  const cards = await enrichCardsWithSets(rows.map((item) => mapCard(item.card)));

  return {
    cards,
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

export async function updateVocabularyCardSets(
  cardId: string,
  setIds: string[]
): Promise<VocabularyCard | null> {
  const db = getDb();
  const trimmedSetIds = Array.from(new Set(setIds.map((id) => id.trim()).filter(Boolean)));

  if (trimmedSetIds.length === 0) {
    throw new Error("Mỗi từ phải thuộc ít nhất 1 bộ từ");
  }

  const cardRows = await db
    .select()
    .from(vocabularyCards)
    .where(eq(vocabularyCards.id, cardId))
    .limit(1);

  if (!cardRows[0]) return null;

  const validSetRows = await db
    .select({ id: vocabularySets.id })
    .from(vocabularySets)
    .where(inArray(vocabularySets.id, trimmedSetIds));

  if (validSetRows.length === 0) {
    throw new Error("Không tìm thấy bộ từ hợp lệ");
  }

  await db.delete(vocabularyCardSets).where(eq(vocabularyCardSets.cardId, cardId));
  await db
    .insert(vocabularyCardSets)
    .values(
      validSetRows.map((setItem) => ({
        cardId,
        setId: setItem.id,
        createdAt: new Date(),
      }))
    )
    .onConflictDoNothing();

  const [updated] = await enrichCardsWithSets([mapCard(cardRows[0])]);
  return updated;
}

export async function renameVocabularySet(setId: string, nextName: string): Promise<VocabularySet | null> {
  const db = getDb();
  const trimmed = nextName.trim();

  if (!trimmed) {
    throw new Error("Tên bộ từ không được để trống");
  }

  const updatedRows = await db
    .update(vocabularySets)
    .set({
      name: trimmed,
      updatedAt: new Date(),
    })
    .where(eq(vocabularySets.id, setId))
    .returning();

  if (!updatedRows[0]) return null;

  const rows = await db
    .select({
      id: vocabularySets.id,
      name: vocabularySets.name,
      coverImageUrl: vocabularySets.coverImageUrl,
      coverImagePublicId: vocabularySets.coverImagePublicId,
      createdAt: vocabularySets.createdAt,
      updatedAt: vocabularySets.updatedAt,
      cardCount: count(vocabularyCardSets.cardId),
    })
    .from(vocabularySets)
    .leftJoin(vocabularyCardSets, eq(vocabularySets.id, vocabularyCardSets.setId))
    .where(eq(vocabularySets.id, setId))
    .groupBy(vocabularySets.id)
    .limit(1);

  return rows[0] ? mapSet(rows[0]) : null;
}

export async function updateVocabularySetCover(
  setId: string,
  cover: { coverImageUrl: string | null; coverImagePublicId: string | null }
): Promise<VocabularySet | null> {
  const db = getDb();

  const updatedRows = await db
    .update(vocabularySets)
    .set({
      coverImageUrl: cover.coverImageUrl,
      coverImagePublicId: cover.coverImagePublicId,
      updatedAt: new Date(),
    })
    .where(eq(vocabularySets.id, setId))
    .returning();

  if (!updatedRows[0]) return null;

  const rows = await db
    .select({
      id: vocabularySets.id,
      name: vocabularySets.name,
      coverImageUrl: vocabularySets.coverImageUrl,
      coverImagePublicId: vocabularySets.coverImagePublicId,
      createdAt: vocabularySets.createdAt,
      updatedAt: vocabularySets.updatedAt,
      cardCount: count(vocabularyCardSets.cardId),
    })
    .from(vocabularySets)
    .leftJoin(vocabularyCardSets, eq(vocabularySets.id, vocabularyCardSets.setId))
    .where(eq(vocabularySets.id, setId))
    .groupBy(vocabularySets.id)
    .limit(1);

  return rows[0] ? mapSet(rows[0]) : null;
}

export async function deleteVocabularySet(setId: string): Promise<boolean> {
  const db = getDb();

  const existing = await db
    .select({ id: vocabularySets.id })
    .from(vocabularySets)
    .where(eq(vocabularySets.id, setId))
    .limit(1);

  if (!existing[0]) return false;

  const orphanCards = await db
    .select({ cardId: vocabularyCardSets.cardId })
    .from(vocabularyCardSets)
    .where(
      and(
        eq(vocabularyCardSets.setId, setId),
        sql`NOT EXISTS (
          SELECT 1
          FROM ${vocabularyCardSets} AS vcs_other
          WHERE vcs_other.card_id = ${vocabularyCardSets.cardId}
            AND vcs_other.set_id <> ${setId}
        )`
      )
    )
    .limit(1);

  if (orphanCards.length > 0) {
    throw new Error("Không thể xóa bộ từ này vì còn từ chỉ thuộc bộ này");
  }

  await db.delete(vocabularySets).where(eq(vocabularySets.id, setId));
  return true;
}

export async function resetVocabularyCard(cardId: string): Promise<VocabularyCard | null> {
  const db = getDb();
  const now = new Date();

  const updated = await db
    .update(vocabularyCards)
    .set({
      status: "new",
      reviewMode: "flashcard",
      repetition: 0,
      interval: 0,
      easeFactor: 2.5,
      lapses: 0,
      dueDate: now,
      lastReviewedAt: null,
      typingEnabled: false,
      masteryScore: 0,
      correctCount: 0,
      wrongCount: 0,
      updatedAt: now,
    })
    .where(eq(vocabularyCards.id, cardId))
    .returning();

  return updated[0] ? mapCard(updated[0]) : null;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = getDb();
  const stats = await getStudyStats();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const summaryRows = await db
    .select({
      totalCards: count(vocabularyCards.id),
      newCards: sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.status} = 'new' THEN 1 ELSE 0 END), 0)`,
      dueToday:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.dueDate} <= NOW() AND ${vocabularyCards.status} <> 'mastered' THEN 1 ELSE 0 END), 0)`,
      masteredCards:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.status} = 'mastered' THEN 1 ELSE 0 END), 0)`,
      learningCards:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.status} = 'learning' THEN 1 ELSE 0 END), 0)`,
      reviewCards:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.status} = 'review' THEN 1 ELSE 0 END), 0)`,
      typingEligible:
        sql<number>`COALESCE(SUM(CASE WHEN ${vocabularyCards.typingEnabled} = true OR ${vocabularyCards.repetition} >= 4 OR ${vocabularyCards.status} = 'mastered' THEN 1 ELSE 0 END), 0)`,
    })
    .from(vocabularyCards);

  const reviewedTodayResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviewLogs)
    .where(gte(reviewLogs.reviewedAt, startOfDay));
  const summary = summaryRows[0];

  return {
    totalCards: Number(summary?.totalCards ?? 0),
    newCards: Number(summary?.newCards ?? 0),
    dueToday: Number(summary?.dueToday ?? 0),
    masteredCards: Number(summary?.masteredCards ?? 0),
    learningCards: Number(summary?.learningCards ?? 0),
    reviewCards: Number(summary?.reviewCards ?? 0),
    typingEligible: Number(summary?.typingEligible ?? 0),
    reviewedToday: Number(reviewedTodayResult[0]?.count ?? 0),
    streak: stats.streak,
  };
}

export async function importVocabularyItems(items: ImportInput[], options?: ImportOptions) {
  const db = getDb();
  const now = new Date();
  const selectedSetIds = await resolveImportSetIds(options);

  if (selectedSetIds.length === 0) {
    throw new Error("Bạn cần chọn ít nhất 1 bộ từ hoặc nhập tên bộ từ mới");
  }

  const values = items.map(({ word, meaning, partOfSpeech }) => {
    const card = createNewCard(word, meaning, partOfSpeech);
    return {
      id: card.id,
      word: card.word,
      partOfSpeech: card.partOfSpeech ?? null,
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

    const lowerWords = Array.from(new Set(items.map((item) => item.word.trim().toLowerCase())));
    if (lowerWords.length > 0) {
      const affectedCards = await db
        .select({ id: vocabularyCards.id })
        .from(vocabularyCards)
        .where(
          sql`LOWER(${vocabularyCards.word}) = ANY(ARRAY[${sql.join(
            lowerWords.map((w) => sql`${w}`),
            sql`, `
          )}])`
        );

      if (affectedCards.length > 0) {
        await db
          .insert(vocabularyCardSets)
          .values(
            affectedCards.flatMap((card) =>
              selectedSetIds.map((setId) => ({
                cardId: card.id,
                setId,
                createdAt: now,
              }))
            )
          )
          .onConflictDoNothing();
      }
    }

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

    const lowerWords = Array.from(new Set(items.map((item) => item.word.trim().toLowerCase())));
    if (lowerWords.length > 0) {
      const affectedCards = await db
        .select({ id: vocabularyCards.id })
        .from(vocabularyCards)
        .where(
          sql`LOWER(${vocabularyCards.word}) = ANY(ARRAY[${sql.join(
            lowerWords.map((w) => sql`${w}`),
            sql`, `
          )}])`
        );

      if (affectedCards.length > 0) {
        await db
          .insert(vocabularyCardSets)
          .values(
            affectedCards.flatMap((card) =>
              selectedSetIds.map((setId) => ({
                cardId: card.id,
                setId,
                createdAt: now,
              }))
            )
          )
          .onConflictDoNothing();
      }
    }

    return {
      insertedCount: insertedRows.length,
      duplicatesSkipped: items.length - insertedRows.length,
      cards: insertedRows.map(mapCard),
    };
  }
}

export async function checkExistingWords(words: string[]): Promise<string[]> {
  if (words.length === 0) return [];
  const db = getDb();
  const lowerWords = Array.from(new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean)));
  if (lowerWords.length === 0) return [];
  const rows = await db
    .select({ word: vocabularyCards.word })
    .from(vocabularyCards)
    .where(sql`LOWER(${vocabularyCards.word}) = ANY(ARRAY[${sql.join(lowerWords.map((w) => sql`${w}`), sql`, `)}])`);
  return Array.from(new Set(rows.map((r) => r.word.toLowerCase())));
}

export async function checkExistingWordsInSets(words: string[], setIds: string[]): Promise<string[]> {
  if (words.length === 0 || setIds.length === 0) return [];

  const db = getDb();
  const lowerWords = Array.from(new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean)));
  const trimmedSetIds = Array.from(new Set(setIds.map((id) => id.trim()).filter(Boolean)));

  if (lowerWords.length === 0 || trimmedSetIds.length === 0) return [];

  const rows = await db
    .select({ word: vocabularyCards.word })
    .from(vocabularyCards)
    .innerJoin(vocabularyCardSets, eq(vocabularyCards.id, vocabularyCardSets.cardId))
    .where(
      and(
        inArray(vocabularyCardSets.setId, trimmedSetIds),
        sql`LOWER(${vocabularyCards.word}) = ANY(ARRAY[${sql.join(lowerWords.map((w) => sql`${w}`), sql`, `)}])`
      )
    );

  return Array.from(new Set(rows.map((r) => r.word.toLowerCase())));
}

function toSessionItems(cards: VocabularyCard[]): ReviewSessionItem[] {
  const typingCandidates = shuffleArray(cards.filter((c) => isTypingEligible(c)));
  const typingQuota = Math.max(0, Math.floor(cards.length * 0.3));
  const typingSet = new Set(typingCandidates.slice(0, typingQuota).map((c) => c.id));

  return cards.map((card) => ({
    card,
    mode: typingSet.has(card.id) ? "typing" : "flashcard",
  }));
}

export async function getDueSessionItems(setId?: string): Promise<ReviewSessionItem[]> {
  const db = getDb();
  const baseCondition = lte(vocabularyCards.dueDate, new Date());

  const rows = setId
    ? await db
        .select({ card: vocabularyCards })
        .from(vocabularyCards)
        .innerJoin(vocabularyCardSets, eq(vocabularyCards.id, vocabularyCardSets.cardId))
        .where(and(baseCondition, eq(vocabularyCardSets.setId, setId)))
        .orderBy(
          asc(
            sql`case
              when ${vocabularyCards.status} = 'learning' then 0
              when ${vocabularyCards.status} = 'review' then 1
              else 2
            end`
          ),
          asc(vocabularyCards.dueDate)
        )
    : await db
        .select({ card: vocabularyCards })
        .from(vocabularyCards)
        .where(baseCondition)
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

  const cards = shuffleArray(rows.map((item) => mapCard(item.card)));
  return toSessionItems(cards);
}

export async function getRandomLibrarySessionItems(limit = 30, setId?: string): Promise<ReviewSessionItem[]> {
  const db = getDb();
  const rows = setId
    ? await db
        .select({ card: vocabularyCards })
        .from(vocabularyCards)
        .innerJoin(vocabularyCardSets, eq(vocabularyCards.id, vocabularyCardSets.cardId))
        .where(eq(vocabularyCardSets.setId, setId))
    : await db
        .select({ card: vocabularyCards })
        .from(vocabularyCards);

  const cards = rows.map((item) => mapCard(item.card));
  const cappedLimit = Math.max(1, limit);
  const randomCards = shuffleArray(cards).slice(0, cappedLimit);
  return toSessionItems(randomCards);
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

export async function importLegacyData(input: {
  cards: VocabularyCard[];
  stats?: StudyStats | null;
}) {
  const imported = await importVocabularyItems(
    input.cards.map((c) => ({
      word: c.word,
      meaning: c.meaning,
      partOfSpeech: c.partOfSpeech ?? null,
    })),
    { newSetNames: ["Bộ từ 1"] }
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
