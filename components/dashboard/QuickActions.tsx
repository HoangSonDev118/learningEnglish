"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlayCircle, Upload, Sparkles, Library } from "lucide-react";

type QuickActionsProps = {
  dueCount: number;
  hasCards: boolean;
  onLoadDemo: () => void;
};

export function QuickActions({ dueCount, hasCards, onLoadDemo }: QuickActionsProps) {

  return (
    <div className="flex flex-wrap gap-3 stagger-in">
      {dueCount > 0 ? (
        <Link href="/review">
          <Button size="lg" className="gap-2">
            <PlayCircle className="h-5 w-5" />
            Bắt đầu ôn tập
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
              {dueCount}
            </span>
          </Button>
        </Link>
      ) : (
        <Button size="lg" disabled className="gap-2 opacity-60">
          <PlayCircle className="h-5 w-5" />
          Không có thẻ đến hạn
        </Button>
      )}

      <Link href="/import">
        <Button variant="outline" size="lg" className="gap-2">
          <Upload className="h-5 w-5" />
          Nhập từ vựng
        </Button>
      </Link>

      <Button variant="secondary" size="lg" className="gap-2" onClick={onLoadDemo}>
        <Sparkles className="h-5 w-5" />
        Nạp dữ liệu mẫu
      </Button>

      {hasCards && (
        <Link href="/library">
          <Button variant="ghost" size="lg" className="gap-2">
            <Library className="h-5 w-5" />
            Xem thư viện
          </Button>
        </Link>
      )}
    </div>
  );
}
