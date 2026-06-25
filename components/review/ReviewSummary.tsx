"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { ReviewSessionSummary } from "@/types/vocab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, RotateCcw } from "lucide-react";

type Props = {
  summary: ReviewSessionSummary;
  onRestart: () => void;
};

export function ReviewSummary({ summary, onRestart }: Props) {
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const isLowPowerDevice =
      (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 6) ||
      (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4);
    const mobileOptimized = isMobile || isLowPowerDevice;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;";
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });
    const colors = ["#7c3aed", "#a78bfa", "#f59e0b", "#34d399", "#60a5fa"];
    const duration = mobileOptimized ? 1600 : 2400;
    const targetFrameMs = mobileOptimized ? 1000 / 24 : 1000 / 45;
    const start = Date.now();
    const end = start + duration;
    let lastFrameTime = 0;
    let rafId: number | null = null;

    const frame = (now = 0) => {
      if (lastFrameTime !== 0 && now - lastFrameTime < targetFrameMs) {
        if (Date.now() < end) rafId = requestAnimationFrame(frame);
        return;
      }
      lastFrameTime = now;

      const progress = Math.min(1, (Date.now() - start) / duration);
      const burstBoost = Math.max(0, 1 - progress * 4.6);
      const currentVelocity = 10 - progress * 5.4 + burstBoost * 10.5;
      const currentGravity = 1.95 - progress * 0.75 + burstBoost * 0.9;
      const spawnChance = burstBoost > 0.45 ? (mobileOptimized ? 0.3 : 0.38) : mobileOptimized ? 0.14 : 0.2;
      const spawnCount = Math.random() < spawnChance ? 1 : 0;

      for (let i = 0; i < spawnCount; i += 1) {
        const originX = 0.02 + Math.random() * 0.96;
        const color = colors[Math.floor(Math.random() * colors.length)];

        myConfetti({
          particleCount: 1,
          startVelocity: currentVelocity + Math.random() * 1.6,
          gravity: currentGravity,
          spread: 24,
          angle: 90 + (Math.random() - 0.5) * 16,
          ticks: mobileOptimized ? 180 : 240,
          origin: { x: originX, y: -0.08 },
          colors: [color],
          scalar: 1.3 + Math.random() * 0.35,
          drift: (Math.random() - 0.5) * 3.8,
        });
      }

      if (Date.now() < end) rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.body.removeChild(canvas);
    };
  }, []);

  return (
    <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-4 page-enter">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 animate-pop-in">
        <Trophy className="h-10 w-10 text-violet-600" />
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
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Tổng quan
          </Button>
        </Link>
        <Button onClick={onRestart} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Ôn tập lại
        </Button>
      </div>
    </div>
  );
}
