"use client";

import { useState, useRef } from "react";
import { useVocab } from "@/context/VocabContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseVocabText } from "@/lib/parser/vocab-parser";
import { ParseResult } from "@/types/vocab";
import { Upload, FileText, AlertTriangle, CheckCircle, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { playClickButtonSound } from "@/lib/utils/click-sound";

export function ImportVocabularyCard() {
  const { showToast } = useVocab();
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showAllPreview, setShowAllPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(false);
  const [existingInLibrary, setExistingInLibrary] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{
    insertedCount: number;
    duplicatesSkipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function checkAgainstLibrary(items: { word: string; meaning: string }[]) {
    if (items.length === 0) return;
    setIsCheckingLibrary(true);
    try {
      const res = await fetch("/api/vocabulary/check-existing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: items.map((i) => i.word) }),
      });
      if (res.ok) {
        const data = (await res.json()) as { existing?: string[] };
        setExistingInLibrary(new Set((data.existing ?? []).map((w) => w.toLowerCase())));
      }
    } catch {
      // Non-critical – preview still works without library check
    } finally {
      setIsCheckingLibrary(false);
    }
  }

  function processText(text: string, name: string) {
    const result = parseVocabText(text);
    setParseResult(result);
    setFileName(name);
    setShowAllPreview(false);
    setExistingInLibrary(new Set());
    void checkAgainstLibrary(result.validItems);
  }

  async function processExcel(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      setParseResult({ validItems: [], invalidLines: [] });
      setFileName(file.name);
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
    });

    const validItems: { word: string; meaning: string }[] = [];
    const invalidLines: { lineNumber: number; content: string; reason: string }[] = [];

    rows.forEach((row, index) => {
      const rawWord = String(row?.[0] ?? "").trim();
      const rawMeaning = String(row?.[1] ?? "").trim();

      // Skip optional header row like "English | Vietnamese".
      if (index === 0) {
        const headerA = rawWord.toLowerCase();
        const headerB = rawMeaning.toLowerCase();
        const maybeHeader =
          (headerA === "english" || headerA === "tiếng anh" || headerA === "tieng anh") &&
          (headerB === "vietnamese" || headerB === "tiếng việt" || headerB === "tieng viet");
        if (maybeHeader) return;
      }

      if (!rawWord && !rawMeaning) return;

      if (!rawWord) {
        invalidLines.push({
          lineNumber: index + 1,
          content: `A: ${rawWord} | B: ${rawMeaning}`,
          reason: "Cột A (tiếng Anh) đang rỗng",
        });
        return;
      }

      if (!rawMeaning) {
        invalidLines.push({
          lineNumber: index + 1,
          content: `A: ${rawWord} | B: ${rawMeaning}`,
          reason: "Cột B (tiếng Việt) đang rỗng",
        });
        return;
      }

      validItems.push({ word: rawWord, meaning: rawMeaning });
    });

    setParseResult({ validItems, invalidLines });
    setFileName(file.name);
    setShowAllPreview(false);
    setExistingInLibrary(new Set());
    void checkAgainstLibrary(validItems);
  }

  async function handleFile(file: File) {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".xlsx")) {
      showToast("Vui lòng tải lên file .txt hoặc .xlsx", "error");
      return;
    }

    try {
      if (lowerName.endsWith(".xlsx")) {
        await processExcel(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => processText(e.target?.result as string, file.name);
      reader.readAsText(file, "utf-8");
    } catch {
      showToast("Không thể đọc file. Vui lòng kiểm tra định dạng", "error");
    }
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

  async function handleImport() {
    if (!parseResult) return;

    // Only import words that are NOT already in the library
    const newItems = parseResult.validItems.filter(
      (item) => !existingInLibrary.has(item.word.toLowerCase())
    );

    if (newItems.length === 0) {
      showToast("Tất cả từ đã có trong thư viện, không có từ mới để thêm", "info");
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch("/api/vocabulary/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });

      const data = (await res.json()) as {
        insertedCount?: number;
        duplicatesSkipped?: number;
        error?: string;
      };

      if (!res.ok) {
        showToast(data.error ?? "Nhập dữ liệu thất bại", "error");
        return;
      }

      const insertedCount = data.insertedCount ?? 0;
      const duplicatesSkipped = data.duplicatesSkipped ?? 0;
      setImportResult({ insertedCount, duplicatesSkipped });

      showToast(`Đã nhập ${insertedCount} từ mới vào thư viện`, "success");
      if (existingInLibrary.size > 0) {
        showToast(`Bỏ qua ${existingInLibrary.size} từ đã có trong thư viện`, "info");
      }

      // Reset to initial state after a successful import.
      handleClear();
    } catch {
      showToast("Nhập dữ liệu thất bại", "error");
    } finally {
      setIsImporting(false);
    }
  }

  function handleClear() {
    setParseResult(null);
    setFileName("");
    setShowAllPreview(false);
    setImportResult(null);
    setExistingInLibrary(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const validCount = parseResult?.validItems.length ?? 0;
  const newCount = (parseResult?.validItems ?? []).filter(
    (item) => !existingInLibrary.has(item.word.toLowerCase())
  ).length;
  const existingCount = existingInLibrary.size;
  const previewItems = showAllPreview
    ? parseResult?.validItems ?? []
    : (parseResult?.validItems ?? []).slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-5 w-5 text-violet-600" />
          Nhập file từ vựng
        </CardTitle>
        <CardDescription>
          Hỗ trợ file .txt (mỗi dòng: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">english: vietnamese</code>)
          {" "}hoặc .xlsx (cột A: tiếng Anh, cột B: tiếng Việt)
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
            <p className="font-medium text-zinc-700">Thả file .txt hoặc .xlsx vào đây</p>
            <p className="mt-1 text-sm text-zinc-400">hoặc bấm để chọn file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.xlsx"
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
                {validCount} hợp lệ
              </Badge>
              {isCheckingLibrary && (
                <Badge variant="secondary">Đang kiểm tra thư viện...</Badge>
              )}
              {!isCheckingLibrary && existingCount > 0 && (
                <Badge variant="due">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {existingCount} đã có trong thư viện
                </Badge>
              )}
              {!isCheckingLibrary && existingCount > 0 && (
                <Badge variant="mastered">
                  {newCount} từ mới sẽ được thêm
                </Badge>
              )}
              {importResult && importResult.duplicatesSkipped > 0 && (
                <Badge variant="secondary">
                  {importResult.duplicatesSkipped} bản ghi trùng (đã bỏ qua)
                </Badge>
              )}
              {parseResult.invalidLines.length > 0 && (
                <Badge variant="due">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {parseResult.invalidLines.length} lỗi
                </Badge>
              )}
            </div>

            {parseResult.invalidLines.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Dòng không hợp lệ (sẽ được bỏ qua)
                </p>
                {parseResult.invalidLines.map((err) => (
                  <div key={err.lineNumber} className="flex items-start gap-2 text-xs text-red-600">
                    <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                      L{err.lineNumber}
                    </span>
                    <span className="text-zinc-600">&quot;{err.content}&quot;</span>
                    <span>- {err.reason}</span>
                  </div>
                ))}
              </div>
            )}

            {validCount > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-700">Xem trước dữ liệu sẽ nhập</p>
                  {validCount > 10 && (
                    <button
                      type="button"
                      onClick={() => setShowAllPreview((prev) => !prev)}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      {showAllPreview ? "Thu gọn" : `Xem thêm ${validCount - 10} dòng`}
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-auto rounded-lg border border-zinc-100">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Tiếng Anh</th>
                        <th className="px-3 py-2 text-left font-semibold">Tiếng Việt</th>
                        <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {previewItems.map((item, idx) => {
                        const inLibrary = existingInLibrary.has(item.word.toLowerCase());
                        return (
                          <tr
                            key={`${item.word}-${item.meaning}-${idx}`}
                            className={inLibrary ? "opacity-50 bg-amber-50" : "hover:bg-violet-50/40"}
                          >
                            <td className="px-3 py-2 text-zinc-800">{item.word}</td>
                            <td className="px-3 py-2 text-zinc-600">{item.meaning}</td>
                            <td className="px-3 py-2">
                              {isCheckingLibrary ? (
                                <span className="text-xs text-zinc-400">...</span>
                              ) : inLibrary ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  đã có
                                </span>
                              ) : (
                                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                                  mới
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {validCount > 0 ? (
              newCount > 0 ? (
                <Button
                  onClick={async () => {
                    playClickButtonSound();
                    await handleImport();
                  }}
                  className="w-full"
                  size="lg"
                  disabled={isImporting || isCheckingLibrary}
                >
                  {isImporting
                    ? "Đang nhập..."
                    : isCheckingLibrary
                    ? "Đang kiểm tra thư viện..."
                    : existingCount > 0
                    ? `Thêm ${newCount} từ mới (bỏ qua ${existingCount} từ đã có)`
                    : `Nhập ${newCount} từ vào bộ học`}
                </Button>
              ) : (
                <p className="text-center text-sm text-amber-600 py-2 bg-amber-50 rounded-xl border border-amber-200 px-4">
                  Tất cả {validCount} từ đã có trong thư viện, không có từ mới để thêm
                </p>
              )
            ) : (
              <p className="text-center text-sm text-zinc-400 py-2">
                Không có từ mới để nhập
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
