import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  boolean,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vocabularyCards = pgTable(
  "vocabulary_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    word: text("word").notNull(),
    meaning: text("meaning").notNull(),

    status: text("status").notNull().default("new"),
    reviewMode: text("review_mode").notNull().default("flashcard"),

    repetition: integer("repetition").notNull().default(0),
    interval: integer("interval").notNull().default(0),
    easeFactor: real("ease_factor").notNull().default(2.5),
    lapses: integer("lapses").notNull().default(0),

    dueDate: timestamp("due_date", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", {
      withTimezone: true,
      mode: "date",
    }),

    typingEnabled: boolean("typing_enabled").notNull().default(false),
    masteryScore: integer("mastery_score").notNull().default(0),
    correctCount: integer("correct_count").notNull().default(0),
    wrongCount: integer("wrong_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    wordLowerUnique: uniqueIndex("vocabulary_cards_word_lower_idx").on(
      sql`lower(${table.word})`
    ),
  })
);

export const vocabularyExamples = pgTable("vocabulary_examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => vocabularyCards.id, { onDelete: "cascade" }),
  sentence: text("sentence").notNull(),
  translation: text("translation"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const reviewLogs = pgTable("review_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => vocabularyCards.id, { onDelete: "cascade" }),

  reviewType: text("review_type").notNull(),
  rating: text("rating"),
  typedAnswer: text("typed_answer"),
  isCorrect: boolean("is_correct"),

  oldRepetition: integer("old_repetition"),
  newRepetition: integer("new_repetition"),
  oldInterval: integer("old_interval"),
  newInterval: integer("new_interval"),
  oldEaseFactor: real("old_ease_factor"),
  newEaseFactor: real("new_ease_factor"),

  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const studyStats = pgTable("study_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  streak: integer("streak").notNull().default(0),
  lastStudyDate: text("last_study_date"),
  totalReviews: integer("total_reviews").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: timestamp("expiration_time", {
      withTimezone: true,
      mode: "date",
    }),
    userAgent: text("user_agent"),
    lastNotifiedAt: timestamp("last_notified_at", {
      withTimezone: true,
      mode: "date",
    }),
    lastNotifiedDueCount: integer("last_notified_due_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    endpointUnique: uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
  })
);
