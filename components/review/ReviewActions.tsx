"use client";

import { ReviewRating } from "@/types/vocab";
import { Button } from "@/components/ui/button";
import { playClickAndEasyTogether, playClickButtonSound } from "@/lib/utils/click-sound";

type Props = {
  onRate: (rating: ReviewRating) => void;
};

const RATINGS: {
  rating: ReviewRating;
  label: string;
  shortcut: string;
  description: string;
  variant: "again" | "hard" | "good" | "easy";
}[] = [
  {
    rating: "again",
    label: "Học lại",
    shortcut: "1",
    description: "Quên mất",
    variant: "again",
  },
  {
    rating: "hard",
    label: "Khó",
    shortcut: "2",
    description: "Nhơ nhớ",
    variant: "hard",
  },
  {
    rating: "good",
    label: "Tốt",
    shortcut: "3",
    description: "Nhớ đúng",
    variant: "good",
  },
  {
    rating: "easy",
    label: "Dễ",
    shortcut: "4",
    description: "Rất dễ",
    variant: "easy",
  },
];

export function ReviewActions({ onRate }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <p className="text-center text-xs text-zinc-400 mb-3 font-medium">
        Bạn nhớ tốt đến mức nào?
      </p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3 stagger-in">
        {RATINGS.map((r) => (
          <Button
            key={r.rating}
            type="button"
            variant={r.variant}
            onClick={() => {
              if (r.rating === "easy") {
                playClickAndEasyTogether();
              } else {
                playClickButtonSound();
              }
              onRate(r.rating);
            }}
            className={`review-action-item min-h-24 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center border-b-4 active:border-b-2 active:translate-y-0.5 ${
              r.variant === "again"
                ? "border-b-red-300"
                : r.variant === "hard"
                  ? "border-b-orange-300"
                  : r.variant === "good"
                    ? "border-b-blue-300"
                    : "border-b-green-300"
            }`}
          >
            <span className="text-base font-bold">{r.label}</span>
            <span className="text-xs opacity-70 hidden sm:block">{r.description}</span>
            <kbd className="mt-1 rounded bg-black/10 px-1.5 py-0.5 text-xs font-mono">
              {r.shortcut}
            </kbd>
          </Button>
        ))}
      </div>
    </div>
  );
}
