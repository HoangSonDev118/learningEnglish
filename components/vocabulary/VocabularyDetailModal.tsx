"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { VocabularyCard } from "@/types/vocab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils/date";
import { X, RotateCcw, Volume2 } from "lucide-react";
import { useVocab } from "@/context/VocabContext";
import { speakEnglish } from "@/lib/utils/speech";
import { playClickButtonSound } from "@/lib/utils/click-sound";

type VocabularyDetailModalProps = {
  card: VocabularyCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset?: (card: VocabularyCard) => void;
};

export function VocabularyDetailModal({ card, open, onOpenChange, onReset }: VocabularyDetailModalProps) {
  const { showToast } = useVocab();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (!card) return;
    const confirmed = window.confirm(`Đặt lại "${card.word}" về trạng thái mới? Toàn bộ tiến độ sẽ bị xóa.`);
    if (!confirmed) return;
    try {
      setResetting(true);
      const res = await fetch(`/api/vocabulary/${card.id}/reset`, { method: "POST" });
      const data = (await res.json()) as { card?: VocabularyCard; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Không thể đặt lại từ vựng", "error");
        return;
      }
      showToast(`Đã đặt lại "${card.word}" về trạng thái mới`, "success");
      onReset?.(data.card!);
      onOpenChange(false);
    } catch {
      showToast("Không thể đặt lại từ vựng", "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-100 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                <span>{card?.word}</span>
                {card?.word ? (
                  <button
                    type="button"
                    onClick={() => {
                      playClickButtonSound();
                      speakEnglish(card.word);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
                    aria-label={`Phát âm từ ${card.word}`}
                    title="Phát âm"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                ) : null}
              </Dialog.Title>
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
          {card && (
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleReset}
                disabled={resetting}
              >
                <RotateCcw className="h-4 w-4" />
                {resetting ? "Đang đặt lại..." : "Học lại từ đầu"}
              </Button>
              <p className="mt-1.5 text-xs text-zinc-400">Xóa toàn bộ tiến độ, đặt lại về từ mới.</p>
            </div>
          )}
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
