import { ParseResult } from "@/types/vocab";

export function parseVocabText(rawText: string): ParseResult {
  const lines = rawText.split("\n");
  const validItems: { word: string; meaning: string }[] = [];
  const invalidLines: { lineNumber: number; content: string; reason: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      invalidLines.push({
        lineNumber: i + 1,
        content: line,
        reason: 'Thiếu dấu ":" để phân cách',
      });
      continue;
    }

    const word = trimmed.slice(0, colonIndex).trim();
    const meaning = trimmed.slice(colonIndex + 1).trim();

    if (!word) {
      invalidLines.push({
        lineNumber: i + 1,
        content: line,
        reason: "Từ tiếng Anh đang rỗng",
      });
      continue;
    }

    if (!meaning) {
      invalidLines.push({
        lineNumber: i + 1,
        content: line,
        reason: "Nghĩa tiếng Việt đang rỗng",
      });
      continue;
    }

    validItems.push({ word, meaning });
  }

  return { validItems, invalidLines };
}

export function deduplicateItems(
  incoming: { word: string; meaning: string }[],
  existing: { word: string }[]
): {
  newItems: { word: string; meaning: string }[];
  duplicates: string[];
} {
  const existingWords = new Set(existing.map((c) => c.word.toLowerCase()));
  const newItems: { word: string; meaning: string }[] = [];
  const duplicates: string[] = [];

  for (const item of incoming) {
    if (existingWords.has(item.word.toLowerCase())) {
      duplicates.push(item.word);
    } else {
      newItems.push(item);
      existingWords.add(item.word.toLowerCase());
    }
  }

  return { newItems, duplicates };
}
