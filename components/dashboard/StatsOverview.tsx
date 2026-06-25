"use client";

import { DashboardSummary } from "@/types/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Flame, Trophy, Clock, Keyboard, Activity } from "lucide-react";

export function StatsOverview({ summary }: { summary: DashboardSummary }) {

  const statItems = [
    {
      label: "Tổng số từ",
      value: summary.totalCards,
      icon: BookOpen,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Đến hạn hôm nay",
      value: summary.dueToday,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Đã nhớ",
      value: summary.masteredCards,
      icon: Trophy,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Chuỗi ngày",
      value: summary.streak,
      icon: Flame,
      color: "text-orange-600",
      bg: "bg-orange-50",
      suffix: "ngày",
    },
    {
      label: "Sẵn sàng gõ",
      value: summary.typingEligible,
      icon: Keyboard,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Đã ôn tập hôm nay",
      value: summary.reviewedToday,
      icon: Activity,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 stagger-in">
      {statItems.map((item) => (
        <Card key={item.label} className="h-full hover:shadow-md transition-shadow">
          <CardContent className="p-4 h-full">
            <div className="flex h-full items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="min-h-8 text-xs font-medium text-zinc-500 uppercase tracking-wide leading-4">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold text-zinc-900 leading-none">
                  {item.value}
                  {item.suffix && (
                    <span className="text-sm font-normal text-zinc-500 ml-1">
                      {item.suffix}
                    </span>
                  )}
                </p>
              </div>
              <div className={`mt-0.5 shrink-0 rounded-xl p-2 ${item.bg}`}>
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
      label: "Mới",
      count: summary.newCards,
      color: "bg-sky-400",
      textColor: "text-sky-700",
      bg: "bg-sky-50",
    },
    {
      label: "Đang học",
      count: summary.learningCards,
      color: "bg-amber-400",
      textColor: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Ôn tập",
      count: summary.reviewCards,
      color: "bg-blue-400",
      textColor: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Đã nhớ",
      count: summary.masteredCards,
      color: "bg-emerald-400",
      textColor: "text-emerald-700",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <Card className="animate-fade-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
      <CardContent className="p-6">
        <p className="text-sm font-semibold text-zinc-700 mb-4">Phân bổ tiến độ</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4">
          {breakdown.map((b) =>
            b.count > 0 ? (
              <div
                key={b.label}
                className={`${b.color} rounded-full transition-all animate-grow-x`}
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
