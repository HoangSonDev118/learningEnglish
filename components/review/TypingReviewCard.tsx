"use client";

import { useState, useRef, useEffect } from "react";
import { VocabularyCard, ReviewRating } from "@/types/vocab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isTypingAnswerCorrect } from "@/lib/srs/typing-review";
import { speakEnglish } from "@/lib/utils/speech";
import { playClickButtonSound, playEasySound, playClickAndEasyTogether } from "@/lib/utils/click-sound";

type TypingReviewCardProps = {
  card: VocabularyCard;
  focusAfterMs?: number;
  onSubmit: (payload: {
    typedAnswer: string;
    isCorrect: boolean;
    ratingIfCorrect?: Exclude<ReviewRating, "again">;
  }) => void | Promise<void>;
};

export function TypingReviewCard({ card, onSubmit, focusAfterMs = 0 }: TypingReviewCardProps) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTapToFocus, setShowTapToFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isIOS = useRef<boolean>(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    isIOS.current = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    setAnswer("");
    setChecked(false);
    setIsCorrect(false);
    setIsSubmitting(false);
    setShowTapToFocus(false);
  }, [card.id]);

  useEffect(() => {
    // Transition effects can temporarily interrupt focus; retry shortly after mount/update.
    let rafId = 0;
    let retryId = 0;

    const runFocus = () => {
      const focusNow = () => inputRef.current?.focus();
      focusNow();
      rafId = window.requestAnimationFrame(focusNow);
      retryId = window.setTimeout(focusNow, 120);
    };

    const startDelay = Math.max(0, focusAfterMs);
    const startId = window.setTimeout(runFocus, startDelay);
    const iosFallbackId = window.setTimeout(() => {
      const active = document.activeElement;
      const isFocused = active === inputRef.current;
      setShowTapToFocus(isIOS.current && !isFocused);
    }, startDelay + 260);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(startId);
      window.clearTimeout(retryId);
      window.clearTimeout(iosFallbackId);
    };
  }, [card.id, focusAfterMs]);

  function handleTapToFocus() {
    inputRef.current?.focus();
    setShowTapToFocus(false);
  }

  function checkAnswer() {
    const correct = isTypingAnswerCorrect(answer, card.word);
    setIsCorrect(correct);
    setChecked(true);
    speakEnglish(card.word);
    if (correct) playEasySound();
  }

  async function handleSubmitCorrect(ratingIfCorrect: Exclude<ReviewRating, "again">) {
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit({ typedAnswer: answer, isCorrect: true, ratingIfCorrect }));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinueWrong() {
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit({ typedAnswer: answer, isCorrect: false }));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-zinc-100 bg-white shadow-xl p-6 min-h-80 animate-pop-in">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3 text-center">
        Chế độ gõ lại
      </p>
      <p className="text-sm text-zinc-500 text-center mb-1.5">Nghĩa tiếng Việt</p>
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-zinc-900 mb-6 leading-tight">
        {card.meaning}
      </h2>

      {!checked ? (
        <div className="min-h-36 animate-fade-up">
          {showTapToFocus && (
            <button
              type="button"
              onClick={handleTapToFocus}
              className="mb-3 w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700"
            >
              Cham vao day de mo ban phim
            </button>
          )}
          <Input
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Nhập từ tiếng Anh"
            className="h-12 text-lg"
            onFocus={() => setShowTapToFocus(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (answer.trim()) checkAnswer();
              }
            }}
          />
          <div className="flex gap-3 mt-6">
            <Button className="flex-1" size="lg" onClick={() => { playClickButtonSound(); checkAnswer(); }} disabled={!answer.trim()}>
              Kiểm tra<span className="hidden sm:inline"> (Enter)</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                playClickButtonSound();
                setAnswer("");
                setChecked(true);
                setIsCorrect(false);
                speakEnglish(card.word);
              }}
            >
              Mình không biết
            </Button>
          </div>
        </div>
      ) : isCorrect ? (
          <div className="min-h-36 animate-fade-up">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-700 font-semibold">
            Chính xác! Chọn độ khó để cập nhật SRS.
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
            <Button
              variant="hard"
              onClick={() => { playClickButtonSound(); handleSubmitCorrect("hard"); }}
              disabled={isSubmitting}
              className="min-h-20 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center border-b-4 active:border-b-2 active:translate-y-0.5 border-b-orange-300"
            >
              <span className="text-base font-bold">Khó</span>
            </Button>
            <Button
              variant="good"
              onClick={() => { playClickButtonSound(); handleSubmitCorrect("good"); }}
              disabled={isSubmitting}
              className="min-h-20 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center border-b-4 active:border-b-2 active:translate-y-0.5 border-b-blue-300"
            >
              <span className="text-base font-bold">Tốt</span>
            </Button>
            <Button
              variant="easy"
              onClick={() => { playClickAndEasyTogether(); handleSubmitCorrect("easy"); }}
              disabled={isSubmitting}
              className="min-h-20 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center border-b-4 active:border-b-2 active:translate-y-0.5 border-b-green-300"
            >
              <span className="text-base font-bold">Dễ</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 min-h-36 animate-fade-up">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-red-700 font-semibold">Chưa đúng</p>
            <p className="text-sm text-zinc-600 mt-1">
              Đáp án đúng: <span className="font-bold text-zinc-900">{card.word}</span>
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={() => { playClickButtonSound(); handleContinueWrong(); }} disabled={isSubmitting}>
            Tiếp tục
          </Button>
        </div>
      )}
    </div>
  );
}
