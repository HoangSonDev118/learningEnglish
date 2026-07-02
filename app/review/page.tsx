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
  VocabularySet,
  VocabularyExample,
} from "@/types/vocab";
import { ArrowLeft, BookOpenText, RotateCcw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { TypingReviewCard } from "@/components/review/TypingReviewCard";
import { ExampleList } from "@/components/vocabulary/ExampleList";
import { Button } from "@/components/ui/button";
import { speakEnglish } from "@/lib/utils/speech";
import { clearClientCache, getClientCache, setClientCache } from "@/lib/utils/client-cache";
import { playClickButtonSound } from "@/lib/utils/click-sound";

const REVIEW_DUE_CACHE_KEY = "review-session-items";
const REVIEW_CACHE_TTL = 30_000;
const RANDOM_REVIEW_LIMIT = 30;
const CARD_SWIPE_OUT_MS = 480;
const CARD_SWIPE_IN_MS = 460;

type SessionSource = "due" | "library-random";
type TransitionPhase = "idle" | "out" | "in";

export default function ReviewPage() {
  type PendingReviewRequest = {
    endpoint: "/api/review/flashcard" | "/api/review/typing";
    body: Record<string, unknown>;
    attempts: number;
    failureMessage: string;
  };

  const { showToast } = useVocab();
  const [setOptions, setSetOptions] = useState<VocabularySet[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [activeSessionSetIds, setActiveSessionSetIds] = useState<string[] | null>(null);
  const [sessionItems, setSessionItems] = useState<ReviewSessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionAttempted, setSessionAttempted] = useState(false);
  const [sessionSource, setSessionSource] = useState<SessionSource>("due");
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [summary, setSummary] = useState<ReviewSessionSummary | null>(null);
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [examples, setExamples] = useState<VocabularyExample[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const syncQueueRef = useRef<PendingReviewRequest[]>([]);
  const isFlushingRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  const currentItem = sessionItems[currentIndex];
  const currentCard = currentItem?.card;

  const normalizeSetIds = useCallback((setIds?: string[]) => {
    if (!setIds || setIds.length === 0) return [];
    const validSetIds = new Set(setOptions.map((item) => item.id));
    const uniqueIds = new Set<string>();
    setIds.forEach((id) => {
      const trimmed = id.trim();
      if (trimmed && validSetIds.has(trimmed)) {
        uniqueIds.add(trimmed);
      }
    });
    return Array.from(uniqueIds);
  }, [setOptions]);

  const buildDueCacheKey = useCallback((setIds?: string[]) => {
    if (!setIds || setIds.length === 0) return REVIEW_DUE_CACHE_KEY;
    const setFilterKey = [...setIds].sort().join(",");
    return `${REVIEW_DUE_CACHE_KEY}:${setFilterKey}`;
  }, []);

  const mergeSessionItems = useCallback((itemGroups: ReviewSessionItem[][], shouldShuffle: boolean) => {
    const mergedMap = new Map<string, ReviewSessionItem>();
    itemGroups.flat().forEach((item) => {
      if (!mergedMap.has(item.card.id)) {
        mergedMap.set(item.card.id, item);
      }
    });

    const mergedItems = Array.from(mergedMap.values());
    if (!shouldShuffle || mergedItems.length <= 1) {
      return mergedItems;
    }

    const shuffled = [...mergedItems];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
    }
    return shuffled;
  }, []);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

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

  useEffect(() => {
    return () => clearTransitionTimer();
  }, [clearTransitionTimer]);

  async function loadSets() {
    try {
      setLoadingSets(true);
      const res = await fetch("/api/vocabulary/sets", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        sets?: VocabularySet[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Không thể tải danh sách bộ từ");
      }

      setSetOptions(data.sets ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải danh sách bộ từ";
      showToast(message, "error");
    } finally {
      setLoadingSets(false);
    }
  }

  async function loadSession(source: SessionSource = "due", requestedSetIds?: string[]) {
    setSessionAttempted(true);
    const isDueSession = source === "due";
    const normalizedSetIds = normalizeSetIds(requestedSetIds);
    const dueCacheKey = buildDueCacheKey(normalizedSetIds);
    const cached = isDueSession
      ? getClientCache<ReviewSessionItem[]>(dueCacheKey, REVIEW_CACHE_TTL)
      : null;
    const hasWarmCache = Boolean(cached && cached.length > 0);
    const hasMultiSetFilter = normalizedSetIds.length > 1;

    setActiveSessionSetIds(normalizedSetIds.length > 0 ? normalizedSetIds : null);

    if (hasWarmCache) {
      const warmCacheItems = cached as ReviewSessionItem[];
      setSessionSource(source);
      setSessionItems(warmCacheItems);
      setSessionStarted(true);
      setCurrentIndex(0);
      setShowAnswer(false);
      setSummary(null);
      setTransitionPhase("idle");
      setCounts({ again: 0, hard: 0, good: 0, easy: 0 });
      setExamples([]);
      setShowExamples(false);
      setSessionLoading(false);
    }

    try {
      if (!hasWarmCache) setSessionLoading(true);
      const modeQuery = isDueSession
        ? "mode=due"
        : `mode=library-random&limit=${RANDOM_REVIEW_LIMIT}`;

      const loadItems = async (setId?: string) => {
        const setQuery = setId ? `&setId=${encodeURIComponent(setId)}` : "";
        const endpoint = `/api/vocabulary/due?${modeQuery}${setQuery}`;
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = (await res.json()) as {
          items?: ReviewSessionItem[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Không thể tải thẻ đến hạn");
        }

        return data.items ?? [];
      };

      const itemGroups =
        normalizedSetIds.length > 0
          ? await Promise.all(normalizedSetIds.map((setId) => loadItems(setId)))
          : [await loadItems()];

      let items = mergeSessionItems(itemGroups, hasMultiSetFilter);
      if (!isDueSession && normalizedSetIds.length > 1 && items.length > RANDOM_REVIEW_LIMIT) {
        items = items.slice(0, RANDOM_REVIEW_LIMIT);
      }

      // Keep current UI stable when loading from cache to avoid random card swaps.
      if (isDueSession) {
        setClientCache(dueCacheKey, items);
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
      setTransitionPhase("idle");
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

  const toggleMultiSetSelection = useCallback((setId: string) => {
    setSelectedSetIds((prev) => {
      if (prev.includes(setId)) {
        return prev.filter((item) => item !== setId);
      }
      return [...prev, setId];
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSets();
    }, 0);
    return () => window.clearTimeout(timer);
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
      if (summary || transitionPhase !== "idle") return;
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
    [showAnswer, sessionStarted, sessionItems, summary, currentItem, transitionPhase] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function moveNext(resolvedRating: ReviewRating) {
    if (transitionPhase !== "idle") return;

    const activeIndex = currentIndex;
    const nextIndex = activeIndex + 1;
    const total = sessionItems.length;
    const nextCounts = {
      again: counts.again + (resolvedRating === "again" ? 1 : 0),
      hard: counts.hard + (resolvedRating === "hard" ? 1 : 0),
      good: counts.good + (resolvedRating === "good" ? 1 : 0),
      easy: counts.easy + (resolvedRating === "easy" ? 1 : 0),
    };
    const outMs = CARD_SWIPE_OUT_MS;
    const inMs = CARD_SWIPE_IN_MS;

    setTransitionPhase("out");
    setCounts((prev) => ({ ...prev, [resolvedRating]: prev[resolvedRating] + 1 }));
    clearTransitionTimer();
    transitionTimerRef.current = window.setTimeout(() => {
      if (nextIndex >= total) {
        setSummary({
          reviewedCount: total,
          againCount: nextCounts.again,
          hardCount: nextCounts.hard,
          goodCount: nextCounts.good,
          easyCount: nextCounts.easy,
        });
        setTransitionPhase("idle");
        const dueCacheKey = buildDueCacheKey(activeSessionSetIds ?? undefined);
        clearClientCache(dueCacheKey);
        return;
      }

      setCurrentIndex(nextIndex);
      setShowAnswer(false);
      setShowExamples(false);
      setExamples([]);
      if (sessionSource === "due") {
        const dueCacheKey = buildDueCacheKey(activeSessionSetIds ?? undefined);
        setClientCache(dueCacheKey, sessionItems.slice(nextIndex));
      }

      setTransitionPhase("in");
      clearTransitionTimer();
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionPhase("idle");
      }, inMs);
    }, outMs);
  }

  function handleFlashcardRate(rating: ReviewRating) {
    if (!currentCard || transitionPhase !== "idle") return;
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
    if (!currentCard || transitionPhase !== "idle") return;
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
    loadSession("library-random", activeSessionSetIds ?? undefined);
  }

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center text-zinc-400 animate-pop-in">
        Đang tải phiên ôn tập...
      </div>
    );
  }

  if (!sessionStarted || sessionItems.length === 0) {
    if (!sessionAttempted) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-8 page-enter space-y-6">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors w-fit">
            <ArrowLeft className="h-4 w-4" />
            Quay lại tổng quan
          </Link>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 animate-pop-in">
            <h2 className="text-xl font-semibold text-zinc-800">Chọn bộ từ để ôn tập</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Bấm vào bộ từ để ôn ngay, hoặc tick nhiều bộ rồi bấm nút ôn tập để trộn.
            </p>

            {loadingSets ? (
              <p className="mt-4 text-sm text-zinc-400">Đang tải bộ từ...</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickButtonSound();
                    void loadSession("due");
                  }}
                  className={`group overflow-hidden rounded-2xl border-2 text-left animate-pop-in transition-[border-color,box-shadow,transform] duration-300 ease-out ${
                    selectedSetIds.length === 0
                      ? "border-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.14)]"
                      : "border-zinc-200 hover:border-violet-300"
                  }`}
                >
                  <div className="h-28 bg-linear-to-br from-violet-500 via-indigo-500 to-cyan-500" />
                  <div className="p-3">
                    <p className="text-sm font-semibold text-zinc-800">Tất cả bộ từ</p>
                    <p className="mt-1 text-xs text-zinc-500">Ôn toàn bộ từ trong hệ thống</p>
                  </div>
                </button>

                {setOptions.map((setItem, index) => {
                  const isSelected = selectedSetIds.includes(setItem.id);
                  return (
                    <div
                      key={setItem.id}
                      className="relative animate-pop-in"
                      style={{
                        animationDelay: `${60 + index * 70}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playClickButtonSound();
                          void loadSession("due", [setItem.id]);
                        }}
                        className={`group w-full overflow-hidden rounded-2xl border-2 text-left transition-[border-color,box-shadow,transform] duration-300 ease-out ${
                          isSelected
                            ? "border-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.14)]"
                            : "border-zinc-200 hover:border-violet-300"
                        }`}
                      >
                        <div className="relative h-28 bg-zinc-100">
                          {setItem.coverImageUrl ? (
                            <Image
                              src={setItem.coverImageUrl}
                              alt={setItem.name}
                              fill
                              sizes="(max-width: 640px) 100vw, 50vw"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-linear-to-br from-zinc-200 to-zinc-300" />
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-800">{setItem.name}</p>
                            {typeof setItem.dueCount === "number" && setItem.dueCount > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                {setItem.dueCount} cần ôn
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {typeof setItem.cardCount === "number"
                              ? `${setItem.cardCount} từ trong bộ này`
                              : "Bộ từ"}
                          </p>
                        </div>
                      </button>

                      <label
                        className="absolute right-3 top-3 z-10 flex h-6 w-6 cursor-pointer items-center justify-center"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMultiSetSelection(setItem.id)}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="h-4 w-4 cursor-pointer accent-violet-600 transition-transform duration-200 ease-out checked:scale-110"
                          aria-label={`Chọn ${setItem.name}`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  playClickButtonSound();
                  void loadSession("due", selectedSetIds);
                }}
                className="gap-2"
                disabled={sessionLoading || loadingSets}
              >
                {selectedSetIds.length > 0
                  ? `Ôn tập ${selectedSetIds.length} bộ đã chọn`
                  : "Bắt đầu ôn tập đến hạn"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  playClickButtonSound();
                  void loadSession("library-random", selectedSetIds);
                }}
                disabled={sessionLoading || loadingSets}
              >
                Ôn ngẫu nhiên 30 từ
              </Button>
            </div>
          </div>
        </div>
      );
    }

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
                loadSession("library-random", activeSessionSetIds ?? undefined);
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
        className={`mb-4 min-h-5 text-xs text-right text-zinc-400 transition-all duration-350 ease-in-out ${
          pendingSyncCount > 0
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-1 scale-95 opacity-0"
        }`}
      >
        Đang đồng bộ nền: {pendingSyncCount}
      </p>

      <ReviewProgress
        current={currentIndex}
        total={sessionItems.length}
      />

      {currentItem.mode === "flashcard" ? (
        <>
          <div
            key={currentCard.id}
            className={
              transitionPhase === "out"
                ? "review-card-swipe-out"
                : transitionPhase === "in"
                  ? "review-card-swipe-in"
                  : ""
            }
          >
            <ReviewCard
              card={currentCard}
              showAnswer={showAnswer}
              onShowAnswer={() => {
                if (transitionPhase !== "idle") return;
                setShowAnswer(true);
                speakEnglish(currentCard.word);
              }}
            />
          </div>
          {showAnswer && (
            <>
              <div className={transitionPhase === "out" ? "review-actions-fall-out" : ""}>
                <ReviewActions onRate={handleFlashcardRate} />
              </div>
              <div className={`mt-6 w-full max-w-2xl mx-auto ${transitionPhase === "out" ? "review-examples-out" : ""}`}>
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
          <div
            key={currentCard.id}
            className={
              transitionPhase === "out"
                ? "review-card-swipe-out"
                : transitionPhase === "in"
                  ? "review-card-swipe-in"
                  : ""
            }
          >
            <TypingReviewCard
              card={currentCard}
              onSubmit={handleTypingSubmit}
              focusAfterMs={transitionPhase === "in" ? CARD_SWIPE_IN_MS + 40 : 0}
            />
          </div>
          <div className={`mt-6 w-full max-w-2xl mx-auto rounded-2xl border border-zinc-100 bg-white p-4 ${transitionPhase === "out" ? "review-examples-out" : ""}`}>
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
