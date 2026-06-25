"use client";

import { useState, useEffect, useCallback } from "react";
import { useVocab } from "@/context/VocabContext";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewActions } from "@/components/review/ReviewActions";
import { ReviewProgress } from "@/components/review/ReviewProgress";
import { ReviewSummary } from "@/components/review/ReviewSummary";
import {
  ReviewRating,
  ReviewSessionItem,
  ReviewSessionSummary,
  VocabularyExample,
} from "@/types/vocab";
import { ArrowLeft, BookOpenText } from "lucide-react";
import Link from "next/link";
import { TypingReviewCard } from "@/components/review/TypingReviewCard";
import { ExampleList } from "@/components/vocabulary/ExampleList";
import { Button } from "@/components/ui/button";
import { speakEnglish } from "@/lib/utils/speech";

export default function ReviewPage() {
  const { showToast } = useVocab();
  const [sessionItems, setSessionItems] = useState<ReviewSessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [examples, setExamples] = useState<VocabularyExample[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);

  const currentItem = sessionItems[currentIndex];
  const currentCard = currentItem?.card;

  async function loadSession() {
    try {
      setSessionLoading(true);
      const res = await fetch("/api/vocabulary/due", { cache: "no-store" });
      const data = (await res.json()) as {
        items?: ReviewSessionItem[];
        error?: string;
      };

      if (!res.ok) {
        showToast(data.error ?? "Khong the tai the den han", "error");
        return;
      }

      const items = data.items ?? [];
      setSessionItems(items);
      setSessionStarted(items.length > 0);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSummary(null);
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
      setExamples([]);
      setShowExamples(false);
    } catch {
      showToast("Khong the tai the den han", "error");
    } finally {
      setSessionLoading(false);
    }
  }

  useEffect(() => {
    loadSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadExamples(cardId: string) {
    try {
      setLoadingExamples(true);
      const res = await fetch(`/api/vocabulary/${cardId}/examples`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { examples?: VocabularyExample[]; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Khong the tai vi du", "error");
        return;
      }
      setExamples(data.examples ?? []);
    } catch {
      showToast("Khong the tai vi du", "error");
    } finally {
      setLoadingExamples(false);
    }
  }

  async function generateExamples(cardId: string) {
    try {
      setGeneratingExamples(true);
      const res = await fetch(`/api/vocabulary/${cardId}/examples/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: examples.length > 0 }),
      });
      const data = (await res.json()) as { examples?: VocabularyExample[]; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Khong the tao vi du", "error");
        return;
      }
      setExamples(data.examples ?? []);
      showToast("Da tao vi du", "success");
    } catch {
      showToast("Khong the tao vi du", "error");
    } finally {
      setGeneratingExamples(false);
    }
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (summary) return;
      if (!sessionStarted || sessionItems.length === 0) return;
      if (!currentItem || currentItem.mode === "typing") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!showAnswer) {
          setShowAnswer(true);
          if (currentCard) {
            speakEnglish(currentCard.word);
          }
        }
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
        if (rating) handleFlashcardRate(rating);
      }
    },
    [showAnswer, sessionStarted, sessionItems, summary, currentItem] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function moveNext(resolvedRating: ReviewRating) {
    setCounts((prev) => ({ ...prev, [resolvedRating]: prev[resolvedRating] + 1 }));

    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionItems.length) {
      const total = sessionItems.length;
      const nextCounts = {
        again: counts.again + (resolvedRating === "again" ? 1 : 0),
        hard: counts.hard + (resolvedRating === "hard" ? 1 : 0),
        good: counts.good + (resolvedRating === "good" ? 1 : 0),
        easy: counts.easy + (resolvedRating === "easy" ? 1 : 0),
      };
      setSummary({
        reviewedCount: total,
        againCount: nextCounts.again,
        hardCount: nextCounts.hard,
        goodCount: nextCounts.good,
        easyCount: nextCounts.easy,
      });
      return;
    }

    setCurrentIndex(nextIndex);
    setShowAnswer(false);
    setShowExamples(false);
    setExamples([]);
  }

  async function handleFlashcardRate(rating: ReviewRating) {
    if (!currentCard) return;
    try {
      const res = await fetch("/api/review/flashcard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: currentCard.id, rating }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Khong the luu ket qua on tap", "error");
        return;
      }
      showToast("Da luu ket qua on tap", "success");
      moveNext(rating);
    } catch {
      showToast("Khong the luu ket qua on tap", "error");
    }
  }

  async function handleTypingSubmit(payload: {
    typedAnswer: string;
    isCorrect: boolean;
    ratingIfCorrect?: Exclude<ReviewRating, "again">;
  }) {
    if (!currentCard) return;
    try {
      const res = await fetch("/api/review/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId: currentCard.id,
          typedAnswer: payload.typedAnswer,
          ratingIfCorrect: payload.ratingIfCorrect,
          expectedWord: currentCard.word,
        }),
      });
      const data = (await res.json()) as {
        resolvedRating?: ReviewRating;
        error?: string;
      };
      if (!res.ok) {
        showToast(data.error ?? "Khong the luu ket qua go lai", "error");
        return;
      }

      const resolvedRating = data.resolvedRating ?? "again";
      showToast("Da luu ket qua on tap", "success");
      moveNext(resolvedRating);
    } catch {
      showToast("Khong the luu ket qua go lai", "error");
    }
  }

  function handleRestart() {
    loadSession();
  }

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-zinc-400">
        Dang tai phien on tap...
      </div>
    );
  }

  if (!sessionStarted || sessionItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Quay lai tong quan
        </Link>
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-24 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-zinc-800">
            Ban da hoan thanh hom nay!
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Hien khong co the den han. Quay lai sau nhe!
          </p>
          <Link
            href="/"
            className="mt-6 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Ve tong quan
          </Link>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <ReviewSummary summary={summary} onRestart={handleRestart} />
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tong quan
        </Link>
        <p className="text-sm font-medium text-zinc-500">
          Phien on tap
        </p>
      </div>

      <ReviewProgress
        current={currentIndex}
        total={sessionItems.length}
      />

      {currentItem.mode === "flashcard" ? (
        <>
          <ReviewCard
            card={currentCard}
            showAnswer={showAnswer}
            onShowAnswer={() => {
              setShowAnswer(true);
              speakEnglish(currentCard.word);
            }}
          />
          {showAnswer && (
            <>
              <ReviewActions onRate={handleFlashcardRate} />
              <div className="mt-6 w-full max-w-2xl mx-auto">
                <button
                  onClick={async () => {
                    const next = !showExamples;
                    setShowExamples(next);
                    if (next && examples.length === 0) {
                      await loadExamples(currentCard.id);
                    }
                  }}
                  className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                >
                  {showExamples ? "An vi du" : "Hien vi du"}
                </button>

                {showExamples && (
                  <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                        <BookOpenText className="h-4 w-4" />
                        Cau vi du
                      </p>
                      <Button size="sm" variant="outline" onClick={() => generateExamples(currentCard.id)} disabled={generatingExamples}>
                        {generatingExamples ? "Dang tao..." : "Tao vi du"}
                      </Button>
                    </div>
                    {loadingExamples ? <p className="text-sm text-zinc-400">Dang tai...</p> : <ExampleList examples={examples} />}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <TypingReviewCard card={currentCard} onSubmit={handleTypingSubmit} />
          <div className="mt-6 w-full max-w-2xl mx-auto rounded-2xl border border-zinc-100 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                <BookOpenText className="h-4 w-4" />
                Cau vi du
              </p>
              <Button size="sm" variant="outline" onClick={() => generateExamples(currentCard.id)} disabled={generatingExamples}>
                {generatingExamples ? "Dang tao..." : "Tao vi du"}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mb-2"
              onClick={() => loadExamples(currentCard.id)}
              disabled={loadingExamples}
            >
              {loadingExamples ? "Dang tai..." : "Tai vi du"}
            </Button>
            <ExampleList examples={examples} />
          </div>
        </>
      )}
    </div>
  );
}
