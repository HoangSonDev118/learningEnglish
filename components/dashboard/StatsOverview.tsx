"use client";

import { useVocab } from "@/context/VocabContext";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Flame, Brain, Trophy, Clock } from "lucide-react";

export function StatsOverview() {
  const { cards, stats, dueCards } = useVocab();

  const totalCards = cards.length;
  const newCards = cards.filter((c) => c.status === "new").length;
  const masteredCards = cards.filter((c) => c.status === "mastered").length;
  const learningCards = cards.filter((c) => c.status === "learning").length;
  const reviewCards = cards.filter((c) => c.status === "review").length;
  const dueCount = dueCards.length;

  const statItems = [
    {
      label: "Total Words",
      value: totalCards,
      icon: BookOpen,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Due Today",
      value: dueCount,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Mastered",
      value: masteredCards,
      icon: Trophy,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Streak",
      value: stats.streak,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
      suffix: "days",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {item.value}
                  {item.suffix && (
                    <span className="text-sm font-normal text-zinc-500 ml-1">
                      {item.suffix}
                    </span>
                  )}
                </p>
              </div>
              <div className={`rounded-xl p-2 ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatusBreakdown() {
  const { cards } = useVocab();
  const total = cards.length;

  if (total === 0) return null;

  const breakdown = [
    {
      label: "New",
      count: cards.filter((c) => c.status === "new").length,
      color: "bg-sky-400",
      textColor: "text-sky-700",
      bg: "bg-sky-50",
    },
    {
      label: "Learning",
      count: cards.filter((c) => c.status === "learning").length,
      color: "bg-amber-400",
      textColor: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Review",
      count: cards.filter((c) => c.status === "review").length,
      color: "bg-blue-400",
      textColor: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Mastered",
      count: cards.filter((c) => c.status === "mastered").length,
      color: "bg-emerald-400",
      textColor: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Progress Breakdown</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
          {breakdown.map((b) =>
            b.count > 0 ? (
              <div
                key={b.label}
                className={`${b.color} rounded-full transition-all`}
                style={{ width: `${(b.count / total) * 100}%` }}
                title={`${b.label}: ${b.count}`}
              />
            ) : null
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {breakdown.map((b) => (
            <div key={b.label} className={`rounded-xl p-2 text-center ${b.bg}`}>
              <p className={`text-lg font-bold ${b.textColor}`}>{b.count}</p>
              <p className="text-xs text-zinc-500">{b.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
