"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

type VocabContextValue = {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
};

const VocabContext = createContext<VocabContextValue | null>(null);

export function VocabProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <VocabContext.Provider
      value={{ toasts, showToast, dismissToast }}
    >
      {children}
    </VocabContext.Provider>
  );
}

export function useVocab() {
  const ctx = useContext(VocabContext);
  if (!ctx) throw new Error("useVocab must be used inside VocabProvider");
  return ctx;
}
