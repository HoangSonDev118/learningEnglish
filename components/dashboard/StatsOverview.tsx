"use client";

import { DashboardSummary } from "@/types/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Flame, Trophy, Clock, Keyboard, Activity } from "lucide-react";

export function StatsOverview({ summary }: { summary: DashboardSummary }) {

  const statItems = [
    {
      label: "Tong so tu",
      value: summary.totalCards,
      icon: BookOpen,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Den han hom nay",
      value: summary.dueToday,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Da nho",
      value: summary.masteredCards,
      icon: Trophy,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Chuoi ngay",
      value: summary.streak,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
      suffix: "ngay",
    },
    {
      label: "San sang go",
      value: summary.typingEligible,
      icon: Keyboard,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Da on tap hom nay",
      value: summary.reviewedToday,
      icon: Activity,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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

export function StatusBreakdown({ summary }: { summary: DashboardSummary }) {
  const total = summary.totalCards;

  if (total === 0) return null;

  const breakdown = [
    {
      label: "Moi",
      count: summary.newCards,
      color: "bg-sky-400",
      textColor: "text-sky-700",
      bg: "bg-sky-50",
    },
    {
      label: "Dang hoc",
      count: summary.learningCards,
      color: "bg-amber-400",
      textColor: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "On tap",
      count: summary.reviewCards,
      color: "bg-blue-400",
      textColor: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Da nho",
      count: summary.masteredCards,
      color: "bg-emerald-400",
      textColor: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Phan bo tien do</p>
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
