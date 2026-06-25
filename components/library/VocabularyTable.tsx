"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardStatus, VocabularyCard } from "@/types/vocab";
import { formatRelativeDate } from "@/lib/utils/date";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { VocabularyDetailModal } from "@/components/vocabulary/VocabularyDetailModal";

type Filter = "all" | CardStatus | "due";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tat ca" },
  { value: "new", label: "Moi" },
  { value: "learning", label: "Dang hoc" },
  { value: "review", label: "On tap" },
  { value: "mastered", label: "Da nho" },
  { value: "due", label: "Den han hom nay" },
];

export function VocabularyTable({ cards }: { cards: VocabularyCard[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCard, setSelectedCard] = useState<VocabularyCard | null>(null);

  const now = new Date();
  const filtered = cards.filter((c) => {
    const matchSearch =
      c.word.toLowerCase().includes(search.toLowerCase()) ||
      c.meaning.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      filter === "all" ||
      (filter === "due" && new Date(c.dueDate) <= now && c.status !== "mastered") ||
      c.status === filter;

    return matchSearch && matchFilter;
  });

  if (cards.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tim tu hoac nghia..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                filter === f.value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              )}
            >
              {f.label}
              <span className="ml-1 opacity-70">
                ({countFilter(cards, f.value, now)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tu vung
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden sm:table-cell">
                Nghia
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Trang thai
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden md:table-cell">
                Khoang lap
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden md:table-cell">
                Lan lap
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 hidden lg:table-cell">
                Lan on tiep
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-400 text-sm">
                  Khong co the nao khop bo loc
                </td>
              </tr>
            ) : (
              filtered.map((card) => (
                <tr
                  key={card.id}
                  className="hover:bg-violet-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedCard(card)}
                >
                  <td className="px-4 py-3 font-semibold text-zinc-900">{card.word}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">
                    {card.meaning}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400 text-right">
        Hien {filtered.length}/{cards.length} tu
      </p>
      <VocabularyDetailModal
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCard(null);
        }}
      />
    </div>
  );
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
  if (status === "new") return "Moi";
  if (status === "learning") return "Dang hoc";
  if (status === "review") return "On tap";
  return "Da nho";
}

function countFilter(cards: VocabularyCard[], filter: Filter, now: Date): number {
  if (filter === "all") return cards.length;
  if (filter === "due")
    return cards.filter(
      (c) => new Date(c.dueDate) <= now && c.status !== "mastered"
    ).length;
  return cards.filter((c) => c.status === filter).length;
}
