"use client";

import { ReviewRating } from "@/types/vocab";
import { Button } from "@/components/ui/button";

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
    label: "Hoc lai",
    shortcut: "1",
    description: "Quen mat",
    variant: "again",
  },
  {
    rating: "hard",
    label: "Kho",
    shortcut: "2",
    description: "Nho duoc nhung hoi kho",
    variant: "hard",
  },
  {
    rating: "good",
    label: "Tot",
    shortcut: "3",
    description: "Nho dung",
    variant: "good",
  },
  {
    rating: "easy",
    label: "De",
    shortcut: "4",
    description: "Rat de",
    variant: "easy",
  },
];

export function ReviewActions({ onRate }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6">
      <p className="text-center text-xs text-zinc-400 mb-3 font-medium">
        Ban nho tot den muc nao?
      </p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {RATINGS.map((r) => (
          <button
            key={r.rating}
            onClick={() => onRate(r.rating)}
            className={`
              flex flex-col items-center gap-1 rounded-2xl border px-2 py-4 text-center
              transition-all active:scale-95 cursor-pointer select-none
              ${r.variant === "again" ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : ""}
              ${r.variant === "hard" ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" : ""}
              ${r.variant === "good" ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" : ""}
              ${r.variant === "easy" ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" : ""}
            `}
          >
            <span className="text-base font-bold">{r.label}</span>
            <span className="text-xs opacity-70 hidden sm:block">{r.description}</span>
            <kbd className="mt-1 rounded bg-black/10 px-1.5 py-0.5 text-xs font-mono">
              {r.shortcut}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
