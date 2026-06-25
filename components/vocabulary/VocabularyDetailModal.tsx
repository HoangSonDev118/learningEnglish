"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { VocabularyCard, VocabularyExample } from "@/types/vocab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExampleList } from "@/components/vocabulary/ExampleList";
import { formatRelativeDate } from "@/lib/utils/date";
import { X } from "lucide-react";
import { useVocab } from "@/context/VocabContext";

type VocabularyDetailModalProps = {
  card: VocabularyCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VocabularyDetailModal({ card, open, onOpenChange }: VocabularyDetailModalProps) {
  const { showToast } = useVocab();
  const [examples, setExamples] = useState<VocabularyExample[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!card || !open) return;

    let mounted = true;
    setLoadingExamples(true);
    fetch(`/api/vocabulary/${card.id}/examples`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setExamples((data.examples ?? []) as VocabularyExample[]);
      })
      .catch(() => {
        if (mounted) setExamples([]);
      })
      .finally(() => {
        if (mounted) setLoadingExamples(false);
      });

    return () => {
      mounted = false;
    };
  }, [card, open]);

  async function handleGenerate(forceRefresh = false) {
    if (!card) return;

    try {
      setGenerating(true);
      const res = await fetch(`/api/vocabulary/${card.id}/examples/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh }),
      });
      const data = (await res.json()) as { examples?: VocabularyExample[]; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Không thể tạo ví dụ", "error");
        return;
      }
      setExamples(data.examples ?? []);
      showToast("Đã tạo ví dụ", "success");
    } catch {
      showToast("Không thể tạo ví dụ", "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <Dialog.Title className="text-xl font-bold text-zinc-900">{card?.word}</Dialog.Title>
              <Dialog.Description className="text-sm text-zinc-500 mt-1">{card?.meaning}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {card && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="Trạng thái" value={mapStatusLabel(card.status)} />
              <Stat label="Lần lặp" value={String(card.repetition)} />
              <Stat label="Khoảng lặp" value={`${card.interval} ngày`} />
              <Stat label="Độ dễ" value={card.easeFactor.toFixed(2)} />
              <Stat label="Lần ôn tiếp" value={formatRelativeDate(card.dueDate)} />
              <Stat label="Đúng" value={String(card.correctCount ?? 0)} />
              <Stat label="Sai" value={String(card.wrongCount ?? 0)} />
              <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
                <p className="text-xs text-zinc-400 mb-1">Chế độ</p>
                <Badge variant="review">{mapModeLabel(card.reviewMode)}</Badge>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-700">Câu ví dụ</h3>
              <div className="flex gap-2">
                {examples.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => handleGenerate(true)} disabled={generating}>
                    Làm mới ví dụ
                  </Button>
                )}
                <Button size="sm" onClick={() => handleGenerate(false)} disabled={generating}>
                  {generating ? "Đang tạo..." : examples.length > 0 ? "Tạo lại" : "Tạo ví dụ"}
                </Button>
              </div>
            </div>

            {loadingExamples ? <p className="text-sm text-zinc-400">Đang tải ví dụ...</p> : <ExampleList examples={examples} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function mapStatusLabel(status: VocabularyCard["status"]): string {
  if (status === "new") return "Mới";
  if (status === "learning") return "Đang học";
  if (status === "review") return "Ôn tập";
  return "Đã nhớ";
}

function mapModeLabel(mode: VocabularyCard["reviewMode"]): string {
  if (mode === "flashcard") return "Thẻ ghi nhớ";
  if (mode === "typing") return "Gõ lại";
  return "Trộn";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-100">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-zinc-700">{value}</p>
    </div>
  );
}
