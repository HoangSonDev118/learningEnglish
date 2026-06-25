"use client";

import { VocabularyExample } from "@/types/vocab";

type ExampleListProps = {
  examples: VocabularyExample[];
};

export function ExampleList({ examples }: ExampleListProps) {
  if (examples.length === 0) {
    return <p className="text-sm text-zinc-400">Chua co cau vi du.</p>;
  }

  return (
    <div className="space-y-3">
      {examples.map((example, index) => (
        <div key={example.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <p className="text-sm font-medium text-zinc-800">
            {index + 1}. {example.sentence}
          </p>
          {example.translation && (
            <p className="text-xs text-zinc-500 mt-1">{example.translation}</p>
          )}
        </div>
      ))}
    </div>
  );
}
