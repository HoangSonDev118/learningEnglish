"use client";

import Link from "next/link";
import { ReviewSessionSummary } from "@/types/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, RotateCcw } from "lucide-react";

type Props = {
  summary: ReviewSessionSummary;
  onRestart: () => void;
};

export function ReviewSummary({ summary, onRestart }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100">
        <Trophy className="h-10 w-10 text-violet-600" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900">Hoan thanh phien on tap!</h2>
      <p className="mt-2 text-zinc-500">Ban da lam rat tot trong hom nay</p>

      <div className="mt-8 w-full max-w-sm">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Da on", value: summary.reviewedCount, color: "text-zinc-900" },
                { label: "Hoc lai", value: summary.againCount, color: "text-red-600" },
                { label: "Kho", value: summary.hardCount, color: "text-orange-600" },
                { label: "Tot", value: summary.goodCount, color: "text-blue-600" },
                { label: "De", value: summary.easyCount, color: "text-green-600" },
              ].map((item) => (
                <div key={item.label} className="text-center rounded-xl bg-zinc-50 p-3">
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Tong quan
          </Button>
        </Link>
        <Button onClick={onRestart} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          On tap lai
        </Button>
      </div>
    </div>
  );
}
