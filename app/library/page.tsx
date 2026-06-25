"use client";

import { useEffect, useState } from "react";
import { useVocab } from "@/context/VocabContext";
import { VocabularyTable } from "@/components/library/VocabularyTable";
import { ArrowLeft, Library } from "lucide-react";
import Link from "next/link";
import { VocabularyCard } from "@/types/vocab";
import { getClientCache, setClientCache } from "@/lib/utils/client-cache";

const LIBRARY_CACHE_KEY = "library-cards";
const LIBRARY_CACHE_TTL = 120_000;

export default function LibraryPage() {
  const { showToast } = useVocab();
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [loading, setLoading] = useState(true);

  async function handleDeleteCard(card: VocabularyCard) {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa từ \"${card.word}\"?`);
    if (!confirmed) return;

    const previous = cards;
    const nextCards = cards.filter((c) => c.id !== card.id);
    setCards(nextCards);
    setClientCache(LIBRARY_CACHE_KEY, nextCards);

    try {
      const res = await fetch(`/api/vocabulary/${card.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setCards(previous);
        setClientCache(LIBRARY_CACHE_KEY, previous);
        showToast(data.error ?? "Không thể xóa từ vựng", "error");
        return;
      }

      showToast("Đã xóa từ vựng", "success");
    } catch {
      setCards(previous);
      setClientCache(LIBRARY_CACHE_KEY, previous);
      showToast("Không thể xóa từ vựng", "error");
    }
  }

  useEffect(() => {
    let mounted = true;

    const cached = getClientCache<VocabularyCard[]>(LIBRARY_CACHE_KEY, LIBRARY_CACHE_TTL);
    if (cached && mounted) {
      setCards(cached);
      setLoading(false);
    }

    fetch("/api/vocabulary/library", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          const nextCards = (data.cards ?? []) as VocabularyCard[];
          setCards(nextCards);
          setClientCache(LIBRARY_CACHE_KEY, nextCards);
        }
      })
      .catch(() => {
        if (mounted && !cached) showToast("Không thể tải thư viện", "error");
      })
      .finally(() => {
        if (mounted && !cached) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              Tổng cộng {cards.length} từ trong bộ học
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-zinc-100 bg-white px-8 py-20 text-center text-zinc-400 animate-pop-in">
          Đang tải thư viện...
        </div>
      ) : cards.length === 0 ? (
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
      ) : (
        <div className="animate-fade-up" style={{ animationDelay: "70ms", animationFillMode: "both" }}>
          <VocabularyTable cards={cards} onDelete={handleDeleteCard} />
        </div>
      )}
    </div>
  );
}
