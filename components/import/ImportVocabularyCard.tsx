"use client";

import { useEffect, useState, useRef } from "react";
import { useVocab } from "@/context/VocabContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { extractWordAndPartOfSpeech, parseVocabText } from "@/lib/parser/vocab-parser";
import { ParseResult } from "@/types/vocab";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  BookOpen,
  ImagePlus,
  XCircle,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { playClickButtonSound } from "@/lib/utils/click-sound";
import Image from "next/image";

type VocabularySet = {
  id: string;
  name: string;
  cardCount?: number;
};

type NewSetCover = {
  coverImageUrl: string;
  coverImagePublicId: string;
};

export function ImportVocabularyCard() {
  const { showToast } = useVocab();
  const [inputMode, setInputMode] = useState<"file" | "manual">("file");
  const [manualInput, setManualInput] = useState("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [showAllPreview, setShowAllPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingLibrary, setIsCheckingLibrary] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [availableSets, setAvailableSets] = useState<VocabularySet[]>([]);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [newSetNamesInput, setNewSetNamesInput] = useState("");
  const [newSetCoverMap, setNewSetCoverMap] = useState<Record<string, NewSetCover>>({});
  const [uploadingCoverName, setUploadingCoverName] = useState<string>("");
  const [existingInSelectedSets, setExistingInSelectedSets] = useState<Set<string>>(new Set());
  const [existingInLibrary, setExistingInLibrary] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{
    insertedCount: number;
    duplicatesSkipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function normalizeSetName(name: string) {
    return name.trim().toLowerCase();
  }

  async function loadSets() {
    try {
      setIsLoadingSets(true);
      const res = await fetch("/api/vocabulary/sets", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { sets?: VocabularySet[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Không thể tải bộ từ");
      }
      setAvailableSets(data.sets ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tải bộ từ";
      showToast(message, "error");
    } finally {
      setIsLoadingSets(false);
    }
  }

  function parseNewSetNames() {
    return Array.from(
      new Set(
        newSetNamesInput
          .split(/[\n,]/g)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  function hasSetSelection() {
    return selectedSetIds.length > 0 || parseNewSetNames().length > 0;
  }

  function getNewSetCoversPayload() {
    const names = parseNewSetNames();
    return names
      .map((name) => {
        const cover = newSetCoverMap[normalizeSetName(name)];
        if (!cover) return null;
        return {
          name,
          coverImageUrl: cover.coverImageUrl,
          coverImagePublicId: cover.coverImagePublicId,
        };
      })
      .filter(Boolean) as {
      name: string;
      coverImageUrl: string;
      coverImagePublicId: string;
    }[];
  }

  async function handleUploadCover(name: string, file: File) {
    if (!file.type.startsWith("image/")) {
      showToast("Vui lòng chọn file ảnh", "error");
      return;
    }

    try {
      setUploadingCoverName(name);
      const formData = new FormData();
      formData.append("setName", name);
      formData.append("file", file);

      const res = await fetch("/api/vocabulary/sets/upload-cover", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as {
        coverImageUrl?: string;
        coverImagePublicId?: string;
        error?: string;
      };

      if (!res.ok || !data.coverImageUrl || !data.coverImagePublicId) {
        showToast(data.error ?? `Không thể tải ảnh cho bộ "${name}"`, "error");
        return;
      }

      const key = normalizeSetName(name);
      setNewSetCoverMap((prev) => ({
        ...prev,
        [key]: {
          coverImageUrl: data.coverImageUrl!,
          coverImagePublicId: data.coverImagePublicId!,
        },
      }));
      showToast(`Đã tải ảnh cho bộ "${name}"`, "success");
    } catch {
      showToast(`Không thể tải ảnh cho bộ "${name}"`, "error");
    } finally {
      setUploadingCoverName("");
    }
  }

  function handleRemoveCover(name: string) {
    const key = normalizeSetName(name);
    setNewSetCoverMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleSetSelection(setId: string) {
    setSelectedSetIds((prev) =>
      prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void checkExistingWords(parseResult?.validItems ?? [], selectedSetIds);
  }, [parseResult, selectedSetIds, newSetNamesInput]); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkExistingWords(
    items: { word: string; meaning: string; partOfSpeech?: string | null }[],
    setIds: string[]
  ) {
    if (items.length === 0) {
      setExistingInSelectedSets(new Set());
      setExistingInLibrary(new Set());
      return;
    }

    const hasSelectedSets = setIds.length > 0;
    const hasNewSetNames = parseNewSetNames().length > 0;

    if (!hasSelectedSets && !hasNewSetNames) {
      setExistingInSelectedSets(new Set());
      setExistingInLibrary(new Set());
      return;
    }

    setIsCheckingLibrary(true);
    try {
      const words = items.map((i) => i.word);
      const requests: Promise<Response>[] = [];

      if (hasSelectedSets) {
        requests.push(
          fetch("/api/vocabulary/check-existing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words, setIds }),
          })
        );
      }

      if (hasNewSetNames) {
        requests.push(
          fetch("/api/vocabulary/check-existing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words }),
          })
        );
      }

      const responses = await Promise.all(requests);
      let responseIndex = 0;

      if (hasSelectedSets) {
        const selectedSetResponse = responses[responseIndex];
        responseIndex += 1;
        if (selectedSetResponse?.ok) {
          const data = (await selectedSetResponse.json()) as { existing?: string[] };
          setExistingInSelectedSets(new Set((data.existing ?? []).map((w) => w.toLowerCase())));
        } else {
          setExistingInSelectedSets(new Set());
        }
      } else {
        setExistingInSelectedSets(new Set());
      }

      if (hasNewSetNames) {
        const libraryResponse = responses[responseIndex];
        if (libraryResponse?.ok) {
          const data = (await libraryResponse.json()) as { existing?: string[] };
          setExistingInLibrary(new Set((data.existing ?? []).map((w) => w.toLowerCase())));
        } else {
          setExistingInLibrary(new Set());
        }
      } else {
        setExistingInLibrary(new Set());
      }
    } catch {
      // Non-critical – preview/import still works without duplicate checks.
      setExistingInSelectedSets(new Set());
      setExistingInLibrary(new Set());
    } finally {
      setIsCheckingLibrary(false);
    }
  }

  function processText(text: string, name: string) {
    const result = parseVocabText(text);
    setParseResult(result);
    setFileName(name);
    setShowAllPreview(false);
    setExistingInSelectedSets(new Set());
    setExistingInLibrary(new Set());
  }

  function parseManualWordList(rawText: string): ParseResult {
    const lines = rawText.split("\n");
    const validItems: { word: string; meaning: string; partOfSpeech?: string | null }[] = [];
    const invalidLines: { lineNumber: number; content: string; reason: string }[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      if (!trimmed) continue;

      const colonIndex = trimmed.indexOf(":");
      const rawWord = colonIndex >= 0 ? trimmed.slice(0, colonIndex).trim() : trimmed;
      const { word, partOfSpeech } = extractWordAndPartOfSpeech(rawWord);
      const meaning = colonIndex >= 0
        ? trimmed.slice(colonIndex + 1).trim() || "(chua nhap nghia)"
        : "(chua nhap nghia)";

      if (!word) {
        invalidLines.push({
          lineNumber: i + 1,
          content: line,
          reason: "Tu tieng Anh dang rong",
        });
        continue;
      }

      const key = word.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      validItems.push({ word, meaning, partOfSpeech });
    }

    return { validItems, invalidLines };
  }

  function handleManualInputImport() {
    const trimmed = manualInput.trim();
    if (!trimmed) {
      showToast("Vui long nhap it nhat 1 dong", "error");
      return;
    }

    const result = parseManualWordList(manualInput);
    if (result.validItems.length === 0) {
      showToast("Khong tim thay tu hop le de nhap", "error");
      return;
    }

    setParseResult(result);
    setFileName("Nhap tay");
    setShowAllPreview(false);
    setExistingInSelectedSets(new Set());
    setExistingInLibrary(new Set());
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

    const validItems: { word: string; meaning: string; partOfSpeech?: string | null }[] = [];
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

      const { word, partOfSpeech } = extractWordAndPartOfSpeech(rawWord);
      if (!word) {
        invalidLines.push({
          lineNumber: index + 1,
          content: `A: ${rawWord} | B: ${rawMeaning}`,
          reason: "Cột A (tiếng Anh) đang rỗng",
        });
        return;
      }

      validItems.push({ word, meaning: rawMeaning, partOfSpeech });
    });

    setParseResult({ validItems, invalidLines });
    setFileName(file.name);
    setShowAllPreview(false);
    setExistingInSelectedSets(new Set());
    setExistingInLibrary(new Set());
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
    if (!hasSetSelection()) {
      showToast("Bạn cần chọn bộ từ hoặc nhập bộ từ mới", "error");
      return;
    }

    const hasSelectedSets = selectedSetIds.length > 0;
    const newItems = hasSelectedSets
      ? parseResult.validItems.filter((item) => !existingInSelectedSets.has(item.word.toLowerCase()))
      : parseResult.validItems;

    if (newItems.length === 0) {
      showToast("Tất cả từ đã có trong bộ đã chọn, không có từ mới để thêm", "info");
      return;
    }

    try {
      setIsImporting(true);
      const res = await fetch("/api/vocabulary/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: newItems,
          setIds: selectedSetIds,
          newSetNames: parseNewSetNames(),
          newSetCovers: getNewSetCoversPayload(),
        }),
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
      if (hasSelectedSets && existingInSelectedSets.size > 0) {
        showToast(`Bỏ qua ${existingInSelectedSets.size} từ đã có trong bộ đã chọn`, "info");
      }

      // Reset to initial state after a successful import.
      handleClear();
      await loadSets();
    } catch {
      showToast("Nhập dữ liệu thất bại", "error");
    } finally {
      setIsImporting(false);
    }
  }

  function handleClear() {
    setParseResult(null);
    setFileName("");
    setManualInput("");
    setShowAllPreview(false);
    setImportResult(null);
    setExistingInSelectedSets(new Set());
    setExistingInLibrary(new Set());
    setSelectedSetIds([]);
    setNewSetNamesInput("");
    setNewSetCoverMap({});
    setUploadingCoverName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const validCount = parseResult?.validItems.length ?? 0;
  const newSetNames = parseNewSetNames();
  const hasSelectedSets = selectedSetIds.length > 0;
  const hasNewSetNames = newSetNames.length > 0;
  const skippedInSelectedSetCount = (parseResult?.validItems ?? []).filter((item) =>
    existingInSelectedSets.has(item.word.toLowerCase())
  ).length;
  const warningInLibraryCount = (parseResult?.validItems ?? []).filter((item) =>
    existingInLibrary.has(item.word.toLowerCase())
  ).length;
  const newCount = hasSelectedSets ? Math.max(0, validCount - skippedInSelectedSetCount) : validCount;
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
          Hỗ trợ file .txt (mỗi dòng: <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">english (n): vietnamese</code>)
          {" "}hoặc .xlsx (cột A: tiếng Anh, cột B: tiếng Việt). Bạn cũng có thể nhập tay mỗi từ một dòng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!parseResult && (
          <div className="inline-flex rounded-xl border border-zinc-200 p-1 bg-zinc-50">
            <button
              type="button"
              onClick={() => setInputMode("file")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "file" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Tải file
            </button>
            <button
              type="button"
              onClick={() => setInputMode("manual")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                inputMode === "manual" ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Nhập
            </button>
          </div>
        )}

        {!parseResult ? (
          inputMode === "file" ? (
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-700">Nhập theo từng dòng</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Mỗi dòng là 1 từ tiếng Anh. Có thể nhập thêm từ loại và nghĩa theo dạng <span className="font-mono">word (n): meaning</span>.
                </p>
              </div>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder={"apple\nmedicine\nnutrition\n\nhoặc:\nsunshine (n): anh nang"}
                className="min-h-48 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <Button
                type="button"
                onClick={handleManualInputImport}
                className="w-full"
              >
                Dùng danh sách này
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-zinc-700">Bộ từ (bắt buộc)</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Chọn bộ từ có sẵn hoặc nhập tên bộ từ mới (phân tách bằng dấu phẩy hoặc xuống dòng).
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Nếu chọn bộ có sẵn, từ trùng trong bộ sẽ tự động bị loại. Nếu tạo bộ mới, hệ thống chỉ cảnh báo số từ trùng.
                </p>
              </div>

              {isLoadingSets ? (
                <p className="text-sm text-zinc-400">Đang tải bộ từ...</p>
              ) : availableSets.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSets.map((setItem) => {
                    const selected = selectedSetIds.includes(setItem.id);
                    return (
                      <button
                        key={setItem.id}
                        type="button"
                        onClick={() => toggleSetSelection(setItem.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300"
                        )}
                      >
                        {setItem.name}
                        {typeof setItem.cardCount === "number" ? ` (${setItem.cardCount})` : ""}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Chưa có bộ từ nào. Hãy nhập tên bộ từ mới bên dưới.</p>
              )}

              <textarea
                value={newSetNamesInput}
                onChange={(e) => {
                  const nextInput = e.target.value;
                  setNewSetNamesInput(nextInput);

                  const activeKeys = new Set(
                    nextInput
                      .split(/[\n,]/g)
                      .map((item) => normalizeSetName(item))
                      .filter(Boolean)
                  );

                  setNewSetCoverMap((prev) => {
                    const next: Record<string, NewSetCover> = {};
                    Object.entries(prev).forEach(([key, value]) => {
                      if (activeKeys.has(key)) {
                        next[key] = value;
                      }
                    });
                    return next;
                  });
                }}
                placeholder="Ví dụ: Bộ từ IELTS, Chủ đề Y khoa"
                className="min-h-20 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />

              {newSetNames.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-violet-100 bg-violet-50/50 p-3 animate-fade-up">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Ảnh bìa cho bộ từ mới
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Bạn có thể tải ảnh cho từng bộ mới ngay tại đây.
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {newSetNames.map((name) => {
                      const key = normalizeSetName(name);
                      const cover = newSetCoverMap[key];
                      const isUploading = uploadingCoverName === name;

                      return (
                        <div key={key} className="rounded-lg border border-zinc-200 bg-white p-3">
                          <p className="text-xs font-semibold text-zinc-700 truncate">{name}</p>
                          <div className="mt-2 h-24 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                            {cover ? (
                              <Image
                                src={cover.coverImageUrl}
                                alt={name}
                                width={320}
                                height={120}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                                Chưa có ảnh
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-violet-300 hover:text-violet-700">
                              <ImagePlus className="h-3.5 w-3.5" />
                              {isUploading ? "Đang tải..." : cover ? "Đổi ảnh" : "Tải ảnh"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    void handleUploadCover(name, file);
                                  }
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                            {cover && (
                              <button
                                type="button"
                                onClick={() => handleRemoveCover(name)}
                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Xóa ảnh
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
                <Badge variant="secondary">Đang kiểm tra từ trùng...</Badge>
              )}
              {!isCheckingLibrary && hasSelectedSets && skippedInSelectedSetCount > 0 && (
                <Badge variant="due">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {skippedInSelectedSetCount} đã có trong bộ đã chọn (sẽ bỏ qua)
                </Badge>
              )}
              {!isCheckingLibrary && hasSelectedSets && skippedInSelectedSetCount > 0 && (
                <Badge variant="mastered">
                  {newCount} từ mới sẽ được thêm
                </Badge>
              )}
              {!isCheckingLibrary && hasNewSetNames && warningInLibraryCount > 0 && (
                <Badge variant="secondary">
                  Cảnh báo: {warningInLibraryCount} từ đã có trong thư viện
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
                        const inSelectedSets = existingInSelectedSets.has(item.word.toLowerCase());
                        const inLibrary = existingInLibrary.has(item.word.toLowerCase());
                        return (
                          <tr
                            key={`${item.word}-${item.meaning}-${idx}`}
                            className={
                              inSelectedSets
                                ? "opacity-50 bg-amber-50"
                                : inLibrary && hasNewSetNames
                                ? "bg-amber-50/50"
                                : "hover:bg-violet-50/40"
                            }
                          >
                            <td className="px-3 py-2 text-zinc-800">{item.word}</td>
                            <td className="px-3 py-2 text-zinc-600">{item.meaning}</td>
                            <td className="px-3 py-2">
                              {isCheckingLibrary ? (
                                <span className="text-xs text-zinc-400">...</span>
                              ) : inSelectedSets ? (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  đã có trong bộ (bỏ qua)
                                </span>
                              ) : inLibrary && hasNewSetNames ? (
                                <span className="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  trùng thư viện (cảnh báo)
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
                  disabled={isImporting || isCheckingLibrary || !hasSetSelection()}
                >
                  {isImporting
                    ? "Đang nhập..."
                    : isCheckingLibrary
                    ? "Đang kiểm tra từ trùng..."
                    : !hasSetSelection()
                    ? "Chọn hoặc nhập bộ từ trước khi thêm"
                    : hasSelectedSets && skippedInSelectedSetCount > 0
                    ? `Thêm ${newCount} từ mới (bỏ qua ${skippedInSelectedSetCount} từ đã có trong bộ)`
                    : `Nhập ${newCount} từ vào bộ học`}
                </Button>
              ) : (
                <p className="text-center text-sm text-amber-600 py-2 bg-amber-50 rounded-xl border border-amber-200 px-4">
                  Tất cả {validCount} từ đã có trong bộ đã chọn, không có từ mới để thêm
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
