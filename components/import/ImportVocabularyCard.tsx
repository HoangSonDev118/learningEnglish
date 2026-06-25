"use client";

import { useState, useRef } from "react";
import { useVocab } from "@/context/VocabContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseVocabText, deduplicateItems } from "@/lib/parser/vocab-parser";
import { createNewCard } from "@/lib/srs/spaced-repetition";
import { ParseResult } from "@/types/vocab";
import { Upload, FileText, AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ImportVocabularyCard() {
  const { cards, addCards, showToast } = useVocab();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function processText(text: string, name: string) {
    const result = parseVocabText(text);
    setParseResult(result);
    setFileName(name);
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".txt")) {
      showToast("Please upload a .txt file", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processText(e.target?.result as string, file.name);
    reader.readAsText(file, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    if (!parseResult) return;
    const { newItems, duplicates } = deduplicateItems(parseResult.validItems, cards);
    const newCards = newItems.map((item) => createNewCard(item.word, item.meaning));
    if (newCards.length > 0) {
      addCards(newCards);
      showToast(`Imported ${newCards.length} new words!`, "success");
    }
    if (duplicates.length > 0) {
      showToast(`Skipped ${duplicates.length} duplicates`, "info");
    }
    setParseResult(null);
    setFileName("");
  }

  function handleClear() {
    setParseResult(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const { newItems = [], duplicates = [] } = parseResult
    ? deduplicateItems(parseResult.validItems, cards)
    : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5 text-violet-600" />
          Import Vocabulary File
        </CardTitle>
        <CardDescription>
          Upload a .txt file with format: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">english: vietnamese</code> per line
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!parseResult ? (
          <div
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer",
              isDragging
                ? "border-violet-400 bg-violet-50"
                : "border-zinc-200 hover:border-violet-300 hover:bg-zinc-50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
              <FileText className="h-7 w-7 text-violet-600" />
            </div>
            <p className="font-medium text-zinc-700">Drop your .txt file here</p>
            <p className="mt-1 text-sm text-zinc-400">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700">{fileName}</span>
              </div>
              <button onClick={handleClear} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="mastered">
                <CheckCircle className="h-3 w-3 mr-1" />
                {newItems.length} new
              </Badge>
              {duplicates.length > 0 && (
                <Badge variant="secondary">
                  {duplicates.length} duplicates (skipped)
                </Badge>
              )}
              {parseResult.invalidLines.length > 0 && (
                <Badge variant="due">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {parseResult.invalidLines.length} errors
                </Badge>
              )}
            </div>

            {parseResult.invalidLines.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Invalid lines (will be skipped)
                </p>
                {parseResult.invalidLines.map((err) => (
                  <div key={err.lineNumber} className="flex items-start gap-2 text-xs text-red-600">
                    <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                      L{err.lineNumber}
                    </span>
                    <span className="text-zinc-600">&quot;{err.content}&quot;</span>
                    <span>— {err.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {newItems.length > 0 ? (
              <Button onClick={handleImport} className="w-full" size="lg">
                Import {newItems.length} words to deck
              </Button>
            ) : (
              <p className="text-center text-sm text-zinc-400 py-2">
                No new words to import
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
