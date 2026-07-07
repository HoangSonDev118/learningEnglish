"use client";

import { ReviewSessionSummary } from "@/types/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, RotateCcw } from "lucide-react";
import { playClickButtonSound } from "@/lib/utils/click-sound";

type Props = {
  summary: ReviewSessionSummary;
  onRestart: () => void;
  onBackToSelection: () => void;
};

export function ReviewSummary({ summary, onRestart, onBackToSelection }: Props) {

  return (
    <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-4 page-enter">
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
        <span className="animate-ring-burst absolute inset-0 rounded-full bg-violet-400 -z-10" style={{ animationDelay: "0ms" }} />
        <span className="animate-ring-burst absolute inset-0 rounded-full bg-violet-300 -z-10" style={{ animationDelay: "500ms" }} />
        <span className="animate-ring-burst absolute inset-0 rounded-full bg-violet-200 -z-10" style={{ animationDelay: "1000ms" }} />
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 animate-pop-in">
          <Trophy className="h-10 w-10 text-violet-600" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-zinc-900">Hoàn thành phiên ôn tập!</h2>
      <p className="mt-2 text-zinc-500">Bạn đã làm rất tốt trong hôm nay</p>

      <div className="mt-8 w-full max-w-sm">
        <Card className="animate-fade-up" style={{ animationDelay: "90ms", animationFillMode: "both" }}>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Đã ôn", value: summary.reviewedCount, color: "text-zinc-900" },
                { label: "Học lại", value: summary.againCount, color: "text-red-600" },
                { label: "Khó", value: summary.hardCount, color: "text-orange-600" },
                { label: "Tốt", value: summary.goodCount, color: "text-blue-600" },
                { label: "Dễ", value: summary.easyCount, color: "text-green-600" },
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
        <Button
          variant="outline"
          className="gap-2 bg-white hover:bg-zinc-100"
          onClick={() => {
            playClickButtonSound();
            onBackToSelection();
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Chọn danh sách ôn tập
        </Button>
        <Button
          onClick={() => {
            playClickButtonSound();
            onRestart();
          }}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Ôn tập lại 30 từ
        </Button>
      </div>
    </div>
  );
}
