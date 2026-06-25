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
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Import Vocabulary</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload a .txt file to add vocabulary to your learning deck
        </p>
      </div>

      <ImportVocabularyCard />

      {/* Format guide */}
      <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-violet-600" />
          <p className="text-sm font-semibold text-zinc-700">File Format Guide</p>
        </div>
        <p className="text-sm text-zinc-500">
          Each line should follow this format:
        </p>
        <pre className="rounded-xl bg-zinc-50 p-4 text-xs font-mono text-zinc-700 leading-relaxed overflow-x-auto">
{`nutrition: dinh dưỡng
medicine: thuốc
symptom: triệu chứng
hygiene: vệ sinh
illness: sự ốm yếu`}
        </pre>
        <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
          <li>One word per line</li>
          <li>Separate English and Vietnamese with a colon <code className="bg-zinc-100 px-1 rounded">:</code></li>
          <li>Empty lines are ignored</li>
          <li>Duplicate words are automatically skipped</li>
        </ul>
      </div>
    </div>
  );
}
