"use client";

import { useVocab } from "@/context/VocabContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils/date";
import { Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export function DueCardsPanel() {
  const { dueCards } = useVocab();

  if (dueCards.length === 0) return null;

  const preview = dueCards.slice(0, 5);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold text-zinc-700">
              Due Now ({dueCards.length})
            </p>
          </div>
          <Link
            href="/review"
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium transition-colors"
          >
            Review all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {preview.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <Badge
                  variant={
                    card.status === "new"
                      ? "new"
                      : card.status === "learning"
                      ? "learning"
                      : "review"
                  }
                >
                  {card.status}
                </Badge>
                <span className="text-sm font-medium text-zinc-800">
                  {card.word}
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {formatRelativeDate(card.dueDate)}
              </span>
            </div>
          ))}
          {dueCards.length > 5 && (
            <p className="text-xs text-zinc-400 text-center pt-1">
              +{dueCards.length - 5} more cards
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
