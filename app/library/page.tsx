"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useVocab } from "@/context/VocabContext";
import { VocabularyTable } from "@/components/library/VocabularyTable";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Library, Search } from "lucide-react";
import Link from "next/link";
import { VocabularyCard } from "@/types/vocab";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 50;

type Filter = "all" | "new" | "learning" | "review" | "mastered" | "due";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "new", label: "Mới" },
  { value: "learning", label: "Đang học" },
  { value: "review", label: "Ôn tập" },
  { value: "mastered", label: "Đã nhớ" },
  { value: "due", label: "Đến hạn hôm nay" },
];

type PageData = {
  cards: VocabularyCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function LibraryPage() {
  const { showToast } = useVocab();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback(
    async (p: number, q: string, f: Filter) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(PAGE_SIZE),
          search: q,
          filter: f,
        });
        const res = await fetch(`/api/vocabulary/library?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as PageData & { error?: string };
        if (!res.ok) {
          showToast(json.error ?? "Không thể tải thư viện", "error");
          return;
        }
        setData(json);
      } catch {
        showToast("Không thể tải thư viện", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  // Initial load
  useEffect(() => {
    void fetchPage(1, "", "all");
  }, [fetchPage]);

  // Debounced search: reset to page 1
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPage(1, value, filter);
    }, 350);
  }

  function handleFilterChange(next: Filter) {
    setFilter(next);
    setPage(1);
    void fetchPage(1, search, next);
  }

  function handlePageChange(next: number) {
    setPage(next);
    void fetchPage(next, search, filter);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCard(card: VocabularyCard) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa từ "${card.word}"?`);
    if (!confirmed) return;

    // Optimistic: remove from current page
    if (data) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              cards: prev.cards.filter((c) => c.id !== card.id),
              total: prev.total - 1,
            }
          : prev
      );
    }

    try {
      const res = await fetch(`/api/vocabulary/${card.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        showToast(json.error ?? "Không thể xóa từ vựng", "error");
        // Rollback: refetch current page
        void fetchPage(page, search, filter);
        return;
      }
      showToast("Đã xóa từ vựng", "success");
      // Refetch to keep counts accurate
      void fetchPage(page, search, filter);
    } catch {
      showToast("Không thể xóa từ vựng", "error");
      void fetchPage(page, search, filter);
    }
  }

  const isEmpty = !loading && data && data.total === 0 && !search && filter === "all";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 page-enter">
      <div className="animate-fade-up">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại tổng quan
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Thư viện từ vựng</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {data ? `Tổng cộng ${data.total} từ trong bộ học` : "Đang tải..."}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center animate-fade-up">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tìm từ hoặc nghĩa..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="rounded-3xl border border-zinc-100 bg-white px-8 py-20 text-center text-zinc-400 animate-pop-in">
          Đang tải thư viện...
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-20 text-center animate-pop-in">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Library className="h-7 w-7 text-zinc-400" />
          </div>
          <p className="font-medium text-zinc-600">Chưa có từ vựng nào</p>
          <p className="mt-1 text-sm text-zinc-400">
            Hãy nhập file hoặc nạp dữ liệu mẫu từ trang tổng quan
          </p>
          <Link
            href="/import"
            className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Nhập từ vựng
          </Link>
        </div>
      ) : data ? (
        <div className={cn("animate-fade-up", loading && "opacity-60 pointer-events-none")}
          style={{ animationDelay: "70ms", animationFillMode: "both" }}>
          <VocabularyTable
            cards={data.cards}
            total={data.total}
            page={data.page}
            pageSize={data.pageSize}
            totalPages={data.totalPages}
            onDelete={handleDeleteCard}
            onPageChange={handlePageChange}
          />
        </div>
      ) : null}
    </div>
  );
}
