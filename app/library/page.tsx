"use client";

import { useVocab } from "@/context/VocabContext";
import { VocabularyTable } from "@/components/library/VocabularyTable";
import { ArrowLeft, Library } from "lucide-react";
import Link from "next/link";

export default function LibraryPage() {
  const { cards } = useVocab();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Vocabulary Library</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {cards.length} total words in your deck
            </p>
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 bg-white px-8 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
            <Library className="h-7 w-7 text-zinc-400" />
          </div>
          <p className="font-medium text-zinc-600">No vocabulary yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Import a file or load demo words from the dashboard
          </p>
          <Link
            href="/import"
            className="mt-5 flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Import Vocabulary
          </Link>
        </div>
      ) : (
        <VocabularyTable />
      )}
    </div>
  );
}
