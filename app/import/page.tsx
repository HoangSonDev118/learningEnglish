"use client";

import { ImportVocabularyCard } from "@/components/import/ImportVocabularyCard";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 page-enter">
      <div className="animate-fade-up">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại tổng quan
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Nhập từ vựng</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tải lên file .txt/.xlsx hoặc nhập mỗi từ một dòng để thêm từ vựng. Khi nhập bắt buộc chọn bộ từ có sẵn hoặc tạo bộ từ mới.
        </p>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "both" }}>
        <ImportVocabularyCard />
      </div>

      {/* Format guide */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-3 animate-fade-up" style={{ animationDelay: "130ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" />
          <p className="text-sm font-semibold text-zinc-700">Hướng dẫn định dạng file</p>
        </div>
        <p className="text-sm text-zinc-500">
          Với file .txt, mỗi dòng cần theo định dạng:
        </p>
        <pre className="rounded-xl bg-zinc-50 p-4 text-xs font-mono text-zinc-700 leading-relaxed overflow-x-auto">
{`nutrition: dinh dưỡng
medicine: thuốc
symptom: triệu chứng
hygiene: vệ sinh
illness: sự ốm yếu`}
        </pre>
        <p className="text-sm text-zinc-500">
          Với file .xlsx: cột A là tiếng Anh, cột B là tiếng Việt (sheet đầu tiên).
        </p>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Có thể nhập chay: mỗi dòng một từ tiếng Anh</li>
          <li>Mỗi dòng một từ</li>
          <li>Tách tiếng Anh và tiếng Việt bằng dấu hai chấm <code className="bg-zinc-100 px-1 rounded">:</code></li>
          <li>Dòng trống sẽ được bỏ qua</li>
          <li>Nếu thêm vào bộ có sẵn: từ trùng trong bộ sẽ tự động bỏ qua</li>
          <li>Nếu tạo bộ mới: chỉ cảnh báo số từ trùng, không tự lọc trước</li>
        </ul>
      </div>
    </div>
  );
}
