"use client";

import { useVocab } from "@/context/VocabContext";
import { cn } from "@/lib/utils/cn";
import { CheckCircle, X, AlertCircle, Info } from "lucide-react";

export function ToastContainer() {
  const { toasts, dismissToast } = useVocab();

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-center gap-3 min-w-70 max-w-sm rounded-xl px-4 py-3 shadow-lg border text-sm font-medium animate-in slide-in-from-right-5 fade-in duration-300",
            toast.type === "success" && "bg-white border-emerald-200 text-emerald-800",
            toast.type === "error" && "bg-white border-red-200 text-red-800",
            toast.type === "info" && "bg-white border-blue-200 text-blue-800"
          )}
        >
          {toast.type === "success" && <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
          {toast.type === "info" && <Info className="h-4 w-4 text-blue-500 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="ml-2 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
