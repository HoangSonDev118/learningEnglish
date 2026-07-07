"use client";

import { ParseResult } from "@/types/vocab";
import { deduplicateItems } from "@/lib/parser/vocab-parser";
import { VocabularyCard } from "@/types/vocab";

type Props = {
  parseResult: ParseResult;
  existingCards: VocabularyCard[];
};

export function ImportPreviewTable({ parseResult, existingCards }: Props) {
  const { newItems, duplicates } = deduplicateItems(parseResult.validItems, existingCards);

  const duplicateSet = new Set(duplicates.map((d) => d.toLowerCase()));

  if (parseResult.validItems.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 border-b border-zinc-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">
              English
            </th>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">
              POS
            </th>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">
              Meaning
            </th>
            <th className="text-left px-4 py-3 font-semibold text-zinc-600 text-xs uppercase tracking-wide">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {parseResult.validItems.map((item, i) => {
            const isDup = duplicateSet.has(item.word.toLowerCase());
            return (
              <tr key={i} className={isDup ? "opacity-50 bg-zinc-50" : "hover:bg-violet-50/40"}>
                <td className="px-4 py-3 font-medium text-zinc-800">{item.word}</td>
                <td className="px-4 py-3 text-zinc-600">{item.partOfSpeech ? `(${item.partOfSpeech})` : "-"}</td>
                <td className="px-4 py-3 text-zinc-600">{item.meaning}</td>
                <td className="px-4 py-3">
                  {isDup ? (
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">
                      duplicate
                    </span>
                  ) : (
                    <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                      new
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
