"use client";

import { useState } from "react";
import { VocabularyCard, ReviewRating } from "@/types/vocab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isTypingAnswerCorrect } from "@/lib/srs/typing-review";
import { speakEnglish } from "@/lib/utils/speech";

type TypingReviewCardProps = {
  card: VocabularyCard;
  onSubmit: (payload: {
    typedAnswer: string;
    isCorrect: boolean;
    ratingIfCorrect?: Exclude<ReviewRating, "again">;
  }) => Promise<void>;
};

export function TypingReviewCard({ card, onSubmit }: TypingReviewCardProps) {
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function checkAnswer() {
    const correct = isTypingAnswerCorrect(answer, card.word);
    setIsCorrect(correct);
    setChecked(true);
    speakEnglish(card.word);
  }

  async function handleSubmitCorrect(ratingIfCorrect: Exclude<ReviewRating, "again">) {
    setIsSubmitting(true);
    try {
      await onSubmit({ typedAnswer: answer, isCorrect: true, ratingIfCorrect });
      setAnswer("");
      setChecked(false);
      setIsCorrect(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContinueWrong() {
    setIsSubmitting(true);
    try {
      await onSubmit({ typedAnswer: answer, isCorrect: false });
      setAnswer("");
      setChecked(false);
      setIsCorrect(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-zinc-100 bg-white shadow-xl p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4 text-center">
        Che do go lai
      </p>
      <p className="text-sm text-zinc-500 text-center mb-2">Nghia tieng Viet</p>
      <h2 className="text-3xl sm:text-4xl font-bold text-center text-zinc-900 mb-8">
        {card.meaning}
      </h2>

      {!checked ? (
        <div className="space-y-4">
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Nhap tu tieng Anh"
            className="h-12 text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                checkAnswer();
              }
            }}
          />
          <div className="flex gap-3">
            <Button className="flex-1" size="lg" onClick={checkAnswer} disabled={!answer.trim()}>
              Kiem tra (Enter)
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setAnswer("");
                setChecked(true);
                setIsCorrect(false);
                speakEnglish(card.word);
              }}
            >
              Minh khong biet
            </Button>
          </div>
        </div>
      ) : isCorrect ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-700 font-semibold">
            Chinh xac! Chon do kho de cap nhat SRS.
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="hard" onClick={() => handleSubmitCorrect("hard")} disabled={isSubmitting}>
              Kho
            </Button>
            <Button variant="good" onClick={() => handleSubmitCorrect("good")} disabled={isSubmitting}>
              Tot
            </Button>
            <Button variant="easy" onClick={() => handleSubmitCorrect("easy")} disabled={isSubmitting}>
              De
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-red-700 font-semibold">Chua dung</p>
            <p className="text-sm text-zinc-600 mt-1">
              Dap an dung: <span className="font-bold text-zinc-900">{card.word}</span>
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={handleContinueWrong} disabled={isSubmitting}>
            Tiep tuc
          </Button>
        </div>
      )}
    </div>
  );
}
