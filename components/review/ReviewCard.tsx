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
          "relative rounded-3xl border border-zinc-100 bg-white shadow-xl overflow-hidden transition-all duration-300",
          showAnswer ? "min-h-85" : "min-h-65"
        )}
      >
        {/* Card front */}
        <div className="flex flex-col items-center justify-center px-10 py-12 text-center min-h-65">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-6">
            English
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 tracking-tight">
            {card.word}
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            repetition #{card.repetition} · interval {card.interval}d
          </p>
        </div>

        {/* Answer section */}
        {showAnswer ? (
          <div className="border-t border-zinc-100 bg-violet-50/60 px-10 py-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">
              Vietnamese
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-violet-900">
              {card.meaning}
            </p>
          </div>
        ) : (
          <div className="flex justify-center pb-8">
            <button
              onClick={onShowAnswer}
              className="flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <Eye className="h-4 w-4" />
              Show Answer
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
