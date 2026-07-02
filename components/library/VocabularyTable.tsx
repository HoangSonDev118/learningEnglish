"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CardStatus, VocabularyCard, VocabularySet } from "@/types/vocab";
import { formatRelativeDate } from "@/lib/utils/date";
import { Trash2, ChevronLeft, ChevronRight, Tags } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { VocabularyDetailModal } from "@/components/vocabulary/VocabularyDetailModal";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

type VocabularyTableProps = {
  cards: VocabularyCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sets: VocabularySet[];
  onDelete: (card: VocabularyCard) => void;
  onPageChange: (page: number) => void;
  onUpdateCardSets: (card: VocabularyCard, setIds: string[]) => Promise<void>;
};

export function VocabularyTable({
  cards,
  total,
  page,
  pageSize,
  totalPages,
  sets,
  onDelete,
  onPageChange,
  onUpdateCardSets,
}: VocabularyTableProps) {
  const [selectedCard, setSelectedCard] = useState<VocabularyCard | null>(null);
  const [editingCard, setEditingCard] = useState<VocabularyCard | null>(null);
  const [editingSetIds, setEditingSetIds] = useState<string[]>([]);
  const [savingSets, setSavingSets] = useState(false);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function openSetEditor(card: VocabularyCard) {
    setEditingCard(card);
    setEditingSetIds(card.setIds ?? []);
  }

  function toggleSet(setId: string) {
    setEditingSetIds((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  }

  async function saveCardSets() {
    if (!editingCard) return;
    if (editingSetIds.length === 0) return;

    setSavingSets(true);
    try {
      await onUpdateCardSets(editingCard, editingSetIds);
      setEditingCard(null);
      setEditingSetIds([]);
    } finally {
      setSavingSets(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Từ vựng
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden sm:table-cell">
                Nghĩa
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden lg:table-cell">
                Bộ từ
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Trạng thái
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden md:table-cell">
                Khoảng lặp
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden md:table-cell">
                Lần lặp
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden lg:table-cell">
                Lần ôn tiếp
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Xóa
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {cards.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400 text-sm">
                  Không có thẻ nào khớp bộ lọc
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr
                  key={card.id}
                  className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCard(card)}
                >
                  <td className="px-4 py-3 font-semibold text-zinc-900">{card.word}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">
                    {card.meaning}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-72">
                      {(card.setNames ?? []).slice(0, 2).map((name) => (
                        <span
                          key={`${card.id}-${name}`}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                        >
                          {name}
                        </span>
                      ))}
                      {(card.setNames?.length ?? 0) > 2 && (
                        <span className="text-[11px] text-zinc-400">
                          +{(card.setNames?.length ?? 0) - 2}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSetEditor(card);
                        }}
                        className="rounded-md border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:border-violet-300 hover:text-violet-700"
                      >
                        Sửa
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={card.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                    {card.interval}d
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                    {card.repetition}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs hidden lg:table-cell">
                    {formatRelativeDate(card.dueDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(card);
                      }}
                      className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label={`Xóa từ ${card.word}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-400">
          {total === 0
            ? "Không có kết quả"
            : `${rangeStart}–${rangeEnd} / ${total} từ`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {buildPageNumbers(page, totalPages).map((item, idx) =>
              item === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-xs text-zinc-400">…</span>
              ) : (
                <button
                  key={item}
                  onClick={() => onPageChange(item as number)}
                  className={cn(
                    "h-8 min-w-8 px-2 rounded-lg text-xs font-medium transition-colors",
                    page === item
                      ? "bg-violet-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  {item}
                </button>
              )
            )}

            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <VocabularyDetailModal
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />

      <Dialog.Root
        open={Boolean(editingCard)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCard(null);
            setEditingSetIds([]);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl">
            <Dialog.Title className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Chỉnh bộ từ cho &quot;{editingCard?.word}&quot;
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-zinc-500">
              Mỗi từ phải thuộc ít nhất 1 bộ từ.
            </Dialog.Description>

            <div className="mt-4 flex flex-wrap gap-2 max-h-52 overflow-auto rounded-xl border border-zinc-100 p-3">
              {sets.map((setItem) => {
                const active = editingSetIds.includes(setItem.id);
                return (
                  <button
                    key={setItem.id}
                    type="button"
                    onClick={() => toggleSet(setItem.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300"
                    )}
                  >
                    {setItem.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCard(null);
                  setEditingSetIds([]);
                }}
              >
                Hủy
              </Button>
              <Button onClick={() => void saveCardSets()} disabled={savingSets || editingSetIds.length === 0}>
                {savingSets ? "Đang lưu..." : "Lưu bộ từ"}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === total || Math.abs(p - current) <= 1)
    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);
}

function StatusBadge({ status }: { status: CardStatus }) {
  return (
    <Badge
      variant={
        status === "new"
          ? "new"
          : status === "learning"
          ? "learning"
          : status === "review"
          ? "review"
          : "mastered"
      }
    >
      {mapStatusLabel(status)}
    </Badge>
  );
}

function mapStatusLabel(status: CardStatus): string {
  if (status === "new") return "Mới";
  if (status === "learning") return "Đang học";
  if (status === "review") return "Ôn tập";
  return "Đã nhớ";
}
