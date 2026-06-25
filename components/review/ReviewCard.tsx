"use client";

import { useState } from "react";
import { VocabularyCard } from "@/types/vocab";
import { cn } from "@/lib/utils/cn";
import { Eye } from "lucide-react";

type Props = {
  card: VocabularyCard;
  showAnswer: boolean;
  onShowAnswer: () => void;
};

export function ReviewCard({ card, showAnswer, onShowAnswer }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative rounded-3xl border border-zinc-100 bg-white shadow-xl overflow-hidden transition-all duration-300"
        )}
      >
        {/* Card front */}
        <div className="flex flex-col items-center justify-center px-8 py-8 text-center min-h-56">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-6">
            Tiếng Anh
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
            {card.word}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            lần lặp #{card.repetition} · khoảng {card.interval} ngày
          </p>
        </div>

        {/* Answer section */}
        {showAnswer ? (
          <div className="border-t border-zinc-100 bg-violet-50/60 px-8 py-5 text-center min-h-24 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
              Tiếng Việt
            </p>
            <p className="text-xl sm:text-2xl font-semibold text-violet-900">
              {card.meaning}
            </p>
          </div>
        ) : (
          <div className="flex justify-center min-h-24 items-center">
            <button
              onClick={onShowAnswer}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <Eye className="h-4 w-4" />
              Hiện đáp án
              <kbd className="ml-1 rounded bg-white/20 px-1.5 py-0.5 text-xs font-mono">
                Space
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
