"use client";

import { useEffect, useState } from "react";
import { useVocab } from "@/context/VocabContext";
import { StatsOverview, StatusBreakdown } from "@/components/dashboard/StatsOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { BookOpen } from "lucide-react";
import Link from "next/link";
import { DashboardSummary } from "@/types/vocab";
import { DEMO_VOCABULARY } from "@/lib/utils/demo-data";
import { migrateLegacyLocalData } from "@/lib/migrate-local-data";
import { getClientCache, setClientCache } from "@/lib/utils/client-cache";

const DASHBOARD_CACHE_KEY = "dashboard-home";
const DASHBOARD_CACHE_TTL = 90_000;

export default function DashboardPage() {
  const { showToast } = useVocab();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    const cached = getClientCache<{ summary: DashboardSummary }>(
      DASHBOARD_CACHE_KEY,
      DASHBOARD_CACHE_TTL
    );

    if (cached) {
      setSummary(cached.summary);
      setLoading(false);
    }

    try {
      if (!cached) setLoading(true);
      const summaryRes = await fetch("/api/dashboard/summary", { cache: "no-store" });

      const summaryData = (await summaryRes.json()) as DashboardSummary;

      setSummary(summaryData);
      setClientCache(DASHBOARD_CACHE_KEY, {
        summary: summaryData,
      });
    } catch {
      if (!cached) showToast("Không thể tải dữ liệu tổng quan", "error");
    } finally {
      if (!cached) setLoading(false);
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
        showToast(data.error ?? "Không thể nạp dữ liệu mẫu", "error");
        return;
      }

      showToast(`Đã nạp dữ liệu mẫu: thêm ${data.insertedCount ?? 0} từ`, "success");
      if ((data.duplicatesSkipped ?? 0) > 0) {
        showToast(`Bỏ qua ${data.duplicatesSkipped} từ bị trùng`, "info");
      }
      await loadDashboard();
    } catch {
      showToast("Không thể nạp dữ liệu mẫu", "error");
    }
  }

  async function handleMigrateLocal() {
    try {
      const result = await migrateLegacyLocalData();
      if (!result.migrated) {
        showToast("Không tìm thấy dữ liệu local để chuyển", "info");
        return;
      }

      showToast(`Đã chuyển ${result.insertedCount} thẻ vào cơ sở dữ liệu`, "success");
      if (result.duplicatesSkipped > 0) {
        showToast(`Bỏ qua ${result.duplicatesSkipped} từ bị trùng`, "info");
      }
      await loadDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Chuyển dữ liệu thất bại", "error");
    }
  }

  const isEmpty = !summary || summary.totalCards === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tổng quan</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Theo dõi tiến độ học từ vựng của bạn
        </p>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-zinc-100 bg-white px-8 py-20 text-center text-zinc-400 animate-pop-in">
          Đang tải tổng quan...
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-20 text-center animate-pop-in">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
            <BookOpen className="h-8 w-8 text-violet-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-800">
            Hãy nhập bộ từ vựng đầu tiên
          </h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Tải lên file .txt hoặc nạp dữ liệu mẫu để bắt đầu học theo ngắt quãng
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/import"
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              Nhập file
            </Link>
          </div>
          <div className="mt-4">
            <QuickActions dueCount={0} hasCards={false} onLoadDemo={handleLoadDemo} />
          </div>
          <button
            onClick={handleMigrateLocal}
            className="mt-4 text-xs text-zinc-500 hover:text-violet-600 transition-colors"
          >
            Chuyển dữ liệu local cũ
          </button>
        </div>
      ) : (
        <>
          <StatsOverview summary={summary} />
          <StatusBreakdown summary={summary} />
          <div className="space-y-4 animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
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
              Chuyển dữ liệu local cũ
            </button>
          </div>
        </>
      )}
    </div>
  );
}

