"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useVocab } from "@/context/VocabContext";
import { VocabularyTable } from "@/components/library/VocabularyTable";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ImagePlus, Library, PencilLine, Search, Tags, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { VocabularyCard, VocabularySet } from "@/types/vocab";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

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
  const [sets, setSets] = useState<VocabularySet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>("all");
  const [editingSetId, setEditingSetId] = useState<string>("");
  const [editingSetName, setEditingSetName] = useState("");
  const [savingSet, setSavingSet] = useState(false);
  const [deletingSet, setDeletingSet] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadSets = useCallback(async () => {
    try {
      const res = await fetch("/api/vocabulary/sets", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as {
        sets?: VocabularySet[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Không thể tải bộ từ");
      }
      const nextSets = json.sets ?? [];
      setSets(nextSets);

      setSelectedSetId((prev) => {
        if (prev !== "all" && !nextSets.some((item) => item.id === prev)) {
          return "all";
        }
        return prev;
      });
      setEditingSetId((prev) => {
        if (prev && !nextSets.some((item) => item.id === prev)) {
          setEditingSetName("");
          return "";
        }
        return prev;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải bộ từ";
      showToast(message, "error");
    }
  }, [showToast]);

  const fetchPage = useCallback(
    async (p: number, q: string, f: Filter, setId: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: String(PAGE_SIZE),
          search: q,
          filter: f,
        });
        if (setId !== "all") {
          params.set("setId", setId);
        }
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
    const timer = window.setTimeout(() => {
      void loadSets();
      void fetchPage(1, "", "all", "all");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchPage, loadSets]);

  // Debounced search: reset to page 1
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchPage(1, value, filter, selectedSetId);
    }, 350);
  }

  function handleFilterChange(next: Filter) {
    setFilter(next);
    setPage(1);
    void fetchPage(1, search, next, selectedSetId);
  }

  function handleSetFilterChange(nextSetId: string) {
    setSelectedSetId(nextSetId);
    setPage(1);
    void fetchPage(1, search, filter, nextSetId);
  }

  function handlePageChange(next: number) {
    setPage(next);
    void fetchPage(next, search, filter, selectedSetId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUpdateCardSets(card: VocabularyCard, setIds: string[]) {
    try {
      const res = await fetch(`/api/vocabulary/${card.id}/sets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setIds }),
      });
      const json = (await res.json().catch(() => ({}))) as { card?: VocabularyCard; error?: string };

      if (!res.ok) {
        showToast(json.error ?? "Không thể cập nhật bộ từ", "error");
        return;
      }

      // Refetch current page to keep set-filter results accurate
      // (a card may no longer belong to the currently selected set).
      await fetchPage(page, search, filter, selectedSetId);
      await loadSets();
      showToast("Đã cập nhật bộ từ cho từ vựng", "success");
    } catch {
      showToast("Không thể cập nhật bộ từ", "error");
    }
  }

  function startRenameSet(setItem: VocabularySet) {
    setEditingSetId(setItem.id);
    setEditingSetName(setItem.name);
  }

  async function handleRenameSet() {
    if (!editingSetId || !editingSetName.trim()) {
      showToast("Tên bộ từ không được để trống", "error");
      return;
    }

    try {
      setSavingSet(true);
      const res = await fetch(`/api/vocabulary/sets/${editingSetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingSetName.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        set?: VocabularySet;
        error?: string;
      };

      if (!res.ok) {
        showToast(json.error ?? "Không thể đổi tên bộ từ", "error");
        return;
      }

      setSets((prev) => prev.map((item) => (item.id === editingSetId ? json.set ?? item : item)));
      await loadSets();
      await fetchPage(page, search, filter, selectedSetId);
      showToast("Đã đổi tên bộ từ", "success");
    } catch {
      showToast("Không thể đổi tên bộ từ", "error");
    } finally {
      setSavingSet(false);
    }
  }

  async function handleDeleteSet(setItem: VocabularySet) {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa bộ từ "${setItem.name}"? Các từ chỉ thuộc bộ này sẽ không cho phép xóa.`
    );
    if (!confirmed) return;

    try {
      setDeletingSet(true);
      const res = await fetch(`/api/vocabulary/sets/${setItem.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        showToast(json.error ?? "Không thể xóa bộ từ", "error");
        return;
      }

      showToast("Đã xóa bộ từ", "success");
      setEditingSetId("");
      setEditingSetName("");
      await loadSets();
      if (selectedSetId === setItem.id) {
        setSelectedSetId("all");
        await fetchPage(1, search, filter, "all");
      } else {
        await fetchPage(page, search, filter, selectedSetId);
      }
    } catch {
      showToast("Không thể xóa bộ từ", "error");
    } finally {
      setDeletingSet(false);
    }
  }

  async function handleUploadSetCover(file: File) {
    if (!editingSetId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file ảnh", "error");
      return;
    }

    try {
      setUploadingCover(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/vocabulary/sets/${editingSetId}/cover`, {
        method: "POST",
        body: formData,
      });
      const json = (await res.json().catch(() => ({}))) as {
        set?: VocabularySet;
        error?: string;
      };

      if (!res.ok) {
        showToast(json.error ?? "Không thể tải ảnh bìa", "error");
        return;
      }

      if (json.set) {
        setSets((prev) => prev.map((item) => (item.id === json.set?.id ? json.set : item)));
      }
      showToast("Đã cập nhật ảnh bìa", "success");
    } catch {
      showToast("Không thể tải ảnh bìa", "error");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveSetCover() {
    if (!editingSetId) return;

    try {
      setRemovingCover(true);
      const res = await fetch(`/api/vocabulary/sets/${editingSetId}/cover`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as {
        set?: VocabularySet;
        error?: string;
      };

      if (!res.ok) {
        showToast(json.error ?? "Không thể xóa ảnh bìa", "error");
        return;
      }

      if (json.set) {
        setSets((prev) => prev.map((item) => (item.id === json.set?.id ? json.set : item)));
      }
      showToast("Đã xóa ảnh bìa", "success");
    } catch {
      showToast("Không thể xóa ảnh bìa", "error");
    } finally {
      setRemovingCover(false);
    }
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
        void fetchPage(page, search, filter, selectedSetId);
        return;
      }
      showToast("Đã xóa từ vựng", "success");
      // Refetch to keep counts accurate
      void fetchPage(page, search, filter, selectedSetId);
    } catch {
      showToast("Không thể xóa từ vựng", "error");
      void fetchPage(page, search, filter, selectedSetId);
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

      <div className="rounded-2xl border border-zinc-100 bg-white p-4 space-y-4 animate-fade-up">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-violet-600" />
          <p className="text-sm font-semibold text-zinc-700">Bộ từ</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSetFilterChange("all")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              selectedSetId === "all"
                ? "border-violet-500 bg-violet-50 text-violet-700"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300"
            )}
          >
            Tất cả bộ từ
          </button>
          {sets.map((setItem) => (
            <button
              key={setItem.id}
              type="button"
              onClick={() => handleSetFilterChange(setItem.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                selectedSetId === setItem.id
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300"
              )}
            >
              {setItem.name}
              {typeof setItem.cardCount === "number" ? ` (${setItem.cardCount})` : ""}
            </button>
          ))}
        </div>

        {sets.length > 0 && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quản lý bộ từ</p>
            <div className="flex flex-wrap gap-2">
              {sets.map((setItem) => (
                <button
                  key={`manage-${setItem.id}`}
                  type="button"
                  onClick={() => startRenameSet(setItem)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    editingSetId === setItem.id
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300"
                  )}
                >
                  {setItem.name}
                </button>
              ))}
            </div>

            {editingSetId && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="relative flex-1">
                    <PencilLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      value={editingSetName}
                      onChange={(e) => setEditingSetName(e.target.value)}
                      placeholder="Tên bộ từ mới"
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={() => void handleRenameSet()} disabled={savingSet || deletingSet || uploadingCover || removingCover}>
                    {savingSet ? "Đang lưu..." : "Đổi tên"}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      const selected = sets.find((item) => item.id === editingSetId);
                      if (selected) {
                        void handleDeleteSet(selected);
                      }
                    }}
                    disabled={savingSet || deletingSet || uploadingCover || removingCover}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingSet ? "Đang xóa..." : "Xóa bộ từ"}
                  </Button>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ảnh bìa bộ từ</p>
                  <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="h-20 w-32 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                      {sets.find((item) => item.id === editingSetId)?.coverImageUrl ? (
                        <Image
                          src={sets.find((item) => item.id === editingSetId)?.coverImageUrl ?? ""}
                          alt="cover"
                          width={128}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleUploadSetCover(file);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={uploadingCover || removingCover || savingSet || deletingSet}
                      >
                        <ImagePlus className="h-4 w-4" />
                        {uploadingCover ? "Đang tải..." : "Tải ảnh lên"}
                      </Button>
                      <Button
                        variant="outline"
                        className="text-zinc-600"
                        onClick={() => void handleRemoveSetCover()}
                        disabled={
                          removingCover ||
                          uploadingCover ||
                          !sets.find((item) => item.id === editingSetId)?.coverImageUrl
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        {removingCover ? "Đang xóa..." : "Xóa ảnh"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
            sets={sets}
            selectedSetId={selectedSetId}
            onDelete={handleDeleteCard}
            onPageChange={handlePageChange}
            onUpdateCardSets={handleUpdateCardSets}
          />
        </div>
      ) : null}
    </div>
  );
}
