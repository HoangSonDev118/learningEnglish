"use client";

import { useState, useEffect, useCallback } from "react";
import { useVocab } from "@/context/VocabContext";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewActions } from "@/components/review/ReviewActions";
import { ReviewProgress } from "@/components/review/ReviewProgress";
import { ReviewSummary } from "@/components/review/ReviewSummary";
import { ReviewRating, ReviewSessionSummary, VocabularyCard } from "@/types/vocab";
import { getDueCards } from "@/lib/srs/spaced-repetition";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReviewPage() {
  const { cards, reviewCard, dueCards } = useVocab();
  const [sessionCards, setSessionCards] = useState<VocabularyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Initialize session on mount
  useEffect(() => {
    const due = getDueCards(cards);
    if (due.length > 0) {
      setSessionCards(due);
      setSessionStarted(true);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSummary(null);
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (summary) return;
      if (!sessionStarted || sessionCards.length === 0) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!showAnswer) setShowAnswer(true);
        return;
      }

      if (showAnswer) {
        const keyMap: Record<string, ReviewRating> = {
          Digit1: "again",
          Digit2: "hard",
          Digit3: "good",
          Digit4: "easy",
        };
        const rating = keyMap[e.code];
        if (rating) handleRate(rating);
      }
    },
    [showAnswer, sessionStarted, sessionCards, summary] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleRate(rating: ReviewRating) {
    const card = sessionCards[currentIndex];
    if (!card) return;

    reviewCard(card.id, rating);
    setCounts((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionCards.length) {
      const total = sessionCards.length;
      setSummary({
        reviewedCount: total,
        againCount: counts.again + (rating === "again" ? 1 : 0),
        hardCount: counts.hard + (rating === "hard" ? 1 : 0),
        goodCount: counts.good + (rating === "good" ? 1 : 0),
        easyCount: counts.easy + (rating === "easy" ? 1 : 0),
      });
    } else {
      setCurrentIndex(nextIndex);
      setShowAnswer(false);
    }
  }

  function handleRestart() {
    const due = getDueCards(cards);
    setSessionCards(due);
    setCurrentIndex(0);
    setShowAnswer(false);
    setSummary(null);
    setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
  }

  // No cards due
  if (!sessionStarted || sessionCards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-24 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-zinc-800">
            You&apos;re all caught up today!
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            No cards are due for review right now. Come back later!
          </p>
          <Link
            href="/"
            className="mt-6 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Summary screen
  if (summary) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ReviewSummary summary={summary} onRestart={handleRestart} />
      </div>
    );
  }

  const currentCard = sessionCards[currentIndex];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <p className="text-sm font-medium text-zinc-500">
          Session Review
        </p>
      </div>

      <ReviewProgress
        current={currentIndex}
        total={sessionCards.length}
      />

      <ReviewCard
        card={currentCard}
        showAnswer={showAnswer}
        onShowAnswer={() => setShowAnswer(true)}
      />

      {showAnswer && <ReviewActions onRate={handleRate} />}
    </div>
  );
}
