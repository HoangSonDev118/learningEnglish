"use client";

import { useVocab } from "@/context/VocabContext";
import { StatsOverview, StatusBreakdown } from "@/components/dashboard/StatsOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DueCardsPanel } from "@/components/dashboard/DueCardsPanel";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { cards } = useVocab();
  const isEmpty = cards.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Track your vocabulary learning progress
        </p>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
            <BookOpen className="h-8 w-8 text-violet-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-800">
            Import your first vocabulary deck
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Upload a .txt file or load demo words to start learning with spaced repetition
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/import"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Import File
            </Link>
          </div>
          <div className="mt-4">
            <QuickActions />
          </div>
        </div>
      ) : (
        <>
          <StatsOverview />
          <StatusBreakdown />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                Quick Actions
              </h2>
              <QuickActions />
            </div>
            <DueCardsPanel />
          </div>
        </>
      )}
    </div>
  );
}

