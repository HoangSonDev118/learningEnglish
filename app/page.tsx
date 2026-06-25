"use client";

import { useEffect, useState } from "react";
import { useVocab } from "@/context/VocabContext";
import { StatsOverview, StatusBreakdown } from "@/components/dashboard/StatsOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DueCardsPanel } from "@/components/dashboard/DueCardsPanel";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { DashboardSummary, ReviewSessionItem, VocabularyCard } from "@/types/vocab";
import { DEMO_VOCABULARY } from "@/lib/utils/demo-data";
import { migrateLegacyLocalData } from "@/lib/migrate-local-data";

export default function DashboardPage() {
  const { showToast } = useVocab();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dueCards, setDueCards] = useState<VocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [summaryRes, dueRes] = await Promise.all([
        fetch("/api/dashboard/summary", { cache: "no-store" }),
        fetch("/api/vocabulary/due", { cache: "no-store" }),
      ]);

      const summaryData = (await summaryRes.json()) as DashboardSummary;
      const dueData = (await dueRes.json()) as { items: ReviewSessionItem[] };

      setSummary(summaryData);
      setDueCards((dueData.items ?? []).map((item) => item.card));
    } catch {
      showToast("Khong the tai du lieu tong quan", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoadDemo() {
    try {
      const res = await fetch("/api/vocabulary/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: DEMO_VOCABULARY }),
      });
      const data = (await res.json()) as { insertedCount?: number; duplicatesSkipped?: number; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Khong the nap du lieu mau", "error");
        return;
      }

      showToast(`Da nap du lieu mau: them ${data.insertedCount ?? 0} tu`, "success");
      if ((data.duplicatesSkipped ?? 0) > 0) {
        showToast(`Bo qua ${data.duplicatesSkipped} tu bi trung`, "info");
      }
      await loadDashboard();
    } catch {
      showToast("Khong the nap du lieu mau", "error");
    }
  }

  async function handleMigrateLocal() {
    try {
      const result = await migrateLegacyLocalData();
      if (!result.migrated) {
        showToast("Khong tim thay du lieu local de chuyen", "info");
        return;
      }

      showToast(`Da chuyen ${result.insertedCount} the vao co so du lieu`, "success");
      if (result.duplicatesSkipped > 0) {
        showToast(`Bo qua ${result.duplicatesSkipped} tu bi trung`, "info");
      }
      await loadDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Chuyen du lieu that bai", "error");
    }
  }

  const isEmpty = !summary || summary.totalCards === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tong quan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Theo doi tien do hoc tu vung cua ban
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-zinc-100 bg-white px-8 py-20 text-center text-zinc-400">
          Dang tai tong quan...
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
            <BookOpen className="h-8 w-8 text-violet-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-800">
            Hay nhap bo tu vung dau tien
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Tai len file .txt hoac nap du lieu mau de bat dau hoc theo ngat quang
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/import"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Nhap file
            </Link>
          </div>
          <div className="mt-4">
            <QuickActions dueCount={0} hasCards={false} onLoadDemo={handleLoadDemo} />
          </div>
          <button
            onClick={handleMigrateLocal}
            className="mt-4 text-xs text-zinc-500 hover:text-violet-600 transition-colors"
          >
            Chuyen du lieu local cu
          </button>
        </div>
      ) : (
        <>
          <StatsOverview summary={summary} />
          <StatusBreakdown summary={summary} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
                Thao tac nhanh
              </h2>
              <QuickActions
                dueCount={summary.dueToday}
                hasCards={summary.totalCards > 0}
                onLoadDemo={handleLoadDemo}
              />
              <button
                onClick={handleMigrateLocal}
                className="text-xs text-zinc-500 hover:text-violet-600 transition-colors"
              >
                Chuyen du lieu local cu
              </button>
            </div>
            <DueCardsPanel dueCards={dueCards} />
          </div>
        </>
      )}
    </div>
  );
}

