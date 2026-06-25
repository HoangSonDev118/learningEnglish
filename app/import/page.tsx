"use client";

import { ImportVocabularyCard } from "@/components/import/ImportVocabularyCard";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lai tong quan
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Nhap tu vung</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tai len file .txt de them tu vung vao bo hoc cua ban
        </p>
      </div>

      <ImportVocabularyCard />

      {/* Format guide */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" />
          <p className="text-sm font-semibold text-zinc-700">Huong dan dinh dang file</p>
        </div>
        <p className="text-sm text-zinc-500">
          Moi dong can theo dinh dang:
        </p>
        <pre className="rounded-xl bg-zinc-50 p-4 text-xs font-mono text-zinc-700 leading-relaxed overflow-x-auto">
{`nutrition: dinh dưỡng
medicine: thuốc
symptom: triệu chứng
hygiene: vệ sinh
illness: sự ốm yếu`}
        </pre>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>Moi dong mot tu</li>
          <li>Tach tieng Anh va tieng Viet bang dau hai cham <code className="bg-zinc-100 px-1 rounded">:</code></li>
          <li>Dong trong se duoc bo qua</li>
          <li>Tu bi trung se tu dong bo qua</li>
        </ul>
      </div>
    </div>
  );
}
