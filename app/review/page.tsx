"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { ArrowLeft, BookOpenText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { TypingReviewCard } from "@/components/review/TypingReviewCard";
import { ExampleList } from "@/components/vocabulary/ExampleList";
import { Button } from "@/components/ui/button";
import { speakEnglish } from "@/lib/utils/speech";
import { clearClientCache, getClientCache, setClientCache } from "@/lib/utils/client-cache";
import { playClickButtonSound } from "@/lib/utils/click-sound";

const REVIEW_DUE_CACHE_KEY = "review-session-items";
const REVIEW_CACHE_TTL = 30_000;
const RANDOM_REVIEW_LIMIT = 30;

type SessionSource = "due" | "library-random";

export default function ReviewPage() {
  type PendingReviewRequest = {
    endpoint: "/api/review/flashcard" | "/api/review/typing";
    body: Record<string, unknown>;
    attempts: number;
    failureMessage: string;
  };

  const { showToast } = useVocab();
  const [sessionItems, setSessionItems] = useState<ReviewSessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionSource, setSessionSource] = useState<SessionSource>("due");
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [examples, setExamples] = useState<VocabularyExample[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const syncQueueRef = useRef<PendingReviewRequest[]>([]);
  const isFlushingRef = useRef(false);

  const currentItem = sessionItems[currentIndex];
  const currentCard = currentItem?.card;

  const flushSyncQueue = useCallback(async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;

    try {
      while (syncQueueRef.current.length > 0) {
        const item = syncQueueRef.current[0];
        try {
          const res = await fetch(item.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.body),
            keepalive: true,
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) {
            throw new Error(data.error ?? item.failureMessage);
          }
          syncQueueRef.current.shift();
          setPendingSyncCount(syncQueueRef.current.length);
        } catch {
          item.attempts += 1;
          if (item.attempts >= 3) {
            syncQueueRef.current.shift();
            setPendingSyncCount(syncQueueRef.current.length);
            showToast(item.failureMessage, "error");
          } else {
            await new Promise((resolve) => setTimeout(resolve, 400 * item.attempts));
          }
        }
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [showToast]);

  const enqueueSyncRequest = useCallback(
    (request: Omit<PendingReviewRequest, "attempts">) => {
      syncQueueRef.current.push({ ...request, attempts: 0 });
      setPendingSyncCount(syncQueueRef.current.length);
      void flushSyncQueue();
    },
    [flushSyncQueue]
  );

  async function loadSession(source: SessionSource = "due") {
    const isDueSession = source === "due";
    const cached = isDueSession
      ? getClientCache<ReviewSessionItem[]>(REVIEW_DUE_CACHE_KEY, REVIEW_CACHE_TTL)
      : null;
    const hasWarmCache = Boolean(cached && cached.length > 0);

    if (hasWarmCache) {
      const warmCacheItems = cached as ReviewSessionItem[];
      setSessionSource(source);
      setSessionItems(warmCacheItems);
      setSessionStarted(true);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSummary(null);
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
      setExamples([]);
      setShowExamples(false);
      setSessionLoading(false);
    }

    try {
      if (!hasWarmCache) setSessionLoading(true);
      const endpoint = isDueSession
        ? "/api/vocabulary/due"
        : `/api/vocabulary/due?mode=library-random&limit=${RANDOM_REVIEW_LIMIT}`;
      const res = await fetch(endpoint, { cache: "no-store" });
      const data = (await res.json()) as {
        items?: ReviewSessionItem[];
        error?: string;
      };

      if (!res.ok) {
        if (!hasWarmCache) {
          showToast(data.error ?? "Không thể tải thẻ đến hạn", "error");
        }
        return;
      }

      const items = data.items ?? [];
      // Keep current UI stable when loading from cache to avoid random card swaps.
      if (isDueSession) {
        setClientCache(REVIEW_DUE_CACHE_KEY, items);
      }
      if (hasWarmCache) {
        return;
      }

      setSessionSource(source);
      setSessionItems(items);
      setSessionStarted(items.length > 0);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSummary(null);
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
      setExamples([]);
      setShowExamples(false);

      if (!isDueSession && items.length === 0) {
        showToast("Thư viện chưa có từ để ôn tập", "error");
      }
    } catch {
      if (!hasWarmCache) showToast("Không thể tải thẻ đến hạn", "error");
    } finally {
      if (!hasWarmCache) setSessionLoading(false);
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
        showToast(data.error ?? "Không thể tải ví dụ", "error");
        return;
      }
      setExamples(data.examples ?? []);
    } catch {
      showToast("Không thể tải ví dụ", "error");
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
        showToast(data.error ?? "Không thể tạo ví dụ", "error");
        return;
      }
      setExamples(data.examples ?? []);
      showToast("Đã tạo ví dụ", "success");
    } catch {
      showToast("Không thể tạo ví dụ", "error");
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
      clearClientCache(REVIEW_DUE_CACHE_KEY);
      return;
    }

    setCurrentIndex(nextIndex);
    setShowAnswer(false);
    setShowExamples(false);
    setExamples([]);
    if (sessionSource === "due") {
      setClientCache(REVIEW_DUE_CACHE_KEY, sessionItems.slice(nextIndex));
    }
  }

  function handleFlashcardRate(rating: ReviewRating) {
    if (!currentCard) return;
    enqueueSyncRequest({
      endpoint: "/api/review/flashcard",
      body: { cardId: currentCard.id, rating },
      failureMessage: "Không thể đồng bộ kết quả ôn tập thẻ",
    });
    moveNext(rating);
  }

  function handleTypingSubmit(payload: {
    typedAnswer: string;
    isCorrect: boolean;
    ratingIfCorrect?: Exclude<ReviewRating, "again">;
  }) {
    if (!currentCard) return;
    const resolvedRating: ReviewRating = payload.isCorrect
      ? payload.ratingIfCorrect ?? "good"
      : "again";

    enqueueSyncRequest({
      endpoint: "/api/review/typing",
      body: {
        cardId: currentCard.id,
        typedAnswer: payload.typedAnswer,
        ratingIfCorrect: payload.ratingIfCorrect,
        expectedWord: currentCard.word,
      },
      failureMessage: "Không thể đồng bộ kết quả ôn tập gõ lại",
    });

    moveNext(resolvedRating);
  }

  function handleRestart() {
    loadSession("library-random");
  }

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-zinc-400 animate-pop-in">
        Đang tải phiên ôn tập...
      </div>
    );
  }

  if (!sessionStarted || sessionItems.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 page-enter">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Quay lại tổng quan
        </Link>
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-24 text-center animate-pop-in">
          <div className="mb-4 text-5xl">🎉</div>
          <h2 className="text-xl font-semibold text-zinc-800">
            Bạn đã hoàn thành hôm nay!
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Hiện không có thẻ đến hạn. Quay lại sau nhé!
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => {
                playClickButtonSound();
                loadSession("library-random");
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Ôn tập lại 30 từ
            </Button>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Về tổng quan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 page-enter">
        <ReviewSummary summary={summary} onRestart={handleRestart} />
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 page-enter">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Tổng quan
        </Link>
        <p className="text-sm font-medium text-zinc-500">
          Phiên ôn tập
        </p>
      </div>

      <p
        className="mb-4 min-h-5 text-xs text-right transition-opacity duration-200 text-zinc-400"
        style={{ opacity: pendingSyncCount > 0 ? 1 : 0 }}
      >
        Đang đồng bộ nền: {pendingSyncCount}
      </p>

      <ReviewProgress
        current={currentIndex}
        total={sessionItems.length}
      />

      {currentItem.mode === "flashcard" ? (
        <>
          <ReviewCard
            key={currentCard.id}
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
                  {showExamples ? "Ẩn ví dụ" : "Hiện ví dụ"}
                </button>

                {showExamples && (
                  <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                        <BookOpenText className="h-4 w-4" />
                        Câu ví dụ
                      </p>
                      <Button size="sm" variant="outline" onClick={() => generateExamples(currentCard.id)} disabled={generatingExamples}>
                        {generatingExamples ? "Đang tạo..." : "Tạo ví dụ"}
                      </Button>
                    </div>
                    {loadingExamples ? <p className="text-sm text-zinc-400">Đang tải...</p> : <ExampleList examples={examples} />}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <TypingReviewCard key={currentCard.id} card={currentCard} onSubmit={handleTypingSubmit} />
          <div className="mt-6 w-full max-w-2xl mx-auto rounded-2xl border border-zinc-100 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-700 flex items-center gap-1.5">
                <BookOpenText className="h-4 w-4" />
                Câu ví dụ
              </p>
              <Button size="sm" variant="outline" onClick={() => generateExamples(currentCard.id)} disabled={generatingExamples}>
                {generatingExamples ? "Đang tạo..." : "Tạo ví dụ"}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mb-2"
              onClick={() => loadExamples(currentCard.id)}
              disabled={loadingExamples}
            >
              {loadingExamples ? "Đang tải..." : "Tải ví dụ"}
            </Button>
            <ExampleList examples={examples} />
          </div>
        </>
      )}
    </div>
  );
}
