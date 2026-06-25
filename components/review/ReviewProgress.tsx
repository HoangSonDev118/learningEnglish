"use client";

type Props = {
  current: number;
  total: number;
};

export function ReviewProgress({ current, total }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-zinc-600">
          {current} / {total} the
        </p>
        <p className="text-sm text-zinc-400">Con lai {total - current}</p>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-violet-500 to-violet-400 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
