"use client";

import Link from "next/link";
import { useVocab } from "@/context/VocabContext";
import { Button } from "@/components/ui/button";
import { createDemoCards } from "@/lib/utils/demo-data";
import { PlayCircle, Upload, Sparkles, Library } from "lucide-react";

export function QuickActions() {
  const { dueCards, cards, addCards, showToast } = useVocab();

  function handleLoadDemo() {
    const existingWords = new Set(cards.map((c) => c.word.toLowerCase()));
    const demos = createDemoCards().filter(
      (c) => !existingWords.has(c.word.toLowerCase())
    );
    if (demos.length === 0) {
      showToast("Demo vocabulary already loaded!", "info");
      return;
    }
    addCards(demos);
    showToast(`Added ${demos.length} demo words!`, "success");
  }

  return (
    <div className="flex flex-wrap gap-3">
      {dueCards.length > 0 ? (
        <Link href="/review">
          <Button size="lg" className="gap-2">
            <PlayCircle className="h-5 w-5" />
            Start Review
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {dueCards.length}
            </span>
          </Button>
        </Link>
      ) : (
        <Button size="lg" disabled className="gap-2 opacity-60">
          <PlayCircle className="h-5 w-5" />
          No cards due
        </Button>
      )}

      <Link href="/import">
        <Button variant="outline" size="lg" className="gap-2">
          <Upload className="h-5 w-5" />
          Import Vocabulary
        </Button>
      </Link>

      <Button variant="secondary" size="lg" className="gap-2" onClick={handleLoadDemo}>
        <Sparkles className="h-5 w-5" />
        Load Demo
      </Button>

      {cards.length > 0 && (
        <Link href="/library">
          <Button variant="ghost" size="lg" className="gap-2">
            <Library className="h-5 w-5" />
            View Library
          </Button>
        </Link>
      )}
    </div>
  );
}
