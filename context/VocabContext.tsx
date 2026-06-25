"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { VocabularyCard, StudyStats, ReviewRating } from "@/types/vocab";
import {
  loadCards,
  saveCards,
  loadStudyStats,
  saveStudyStats,
} from "@/lib/storage/local-storage";
import { applyReview, getDueCards } from "@/lib/srs/spaced-repetition";
import { todayString } from "@/lib/utils/date";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

type VocabContextValue = {
  cards: VocabularyCard[];
  stats: StudyStats;
  dueCards: VocabularyCard[];
  addCards: (cards: VocabularyCard[]) => void;
  reviewCard: (cardId: string, rating: ReviewRating) => void;
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
};

const VocabContext = createContext<VocabContextValue | null>(null);

export function VocabProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<VocabularyCard[]>([]);
  const [stats, setStats] = useState<StudyStats>({ streak: 0, totalReviews: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCards(loadCards());
    setStats(loadStudyStats());
    setMounted(true);
  }, []);

  const dueCards = mounted ? getDueCards(cards) : [];

  const addCards = useCallback(
    (newCards: VocabularyCard[]) => {
      setCards((prev) => {
        const updated = [...prev, ...newCards];
        saveCards(updated);
        return updated;
      });
    },
    []
  );

  const reviewCard = useCallback(
    (cardId: string, rating: ReviewRating) => {
      setCards((prev) => {
        const updated = prev.map((c) =>
          c.id === cardId ? applyReview(c, rating) : c
        );
        saveCards(updated);
        return updated;
      });

      setStats((prev) => {
        const today = todayString();
        const isNewDay = prev.lastStudyDate !== today;
        const newStats: StudyStats = {
          streak: isNewDay ? prev.streak + 1 : prev.streak,
          lastStudyDate: today,
          totalReviews: prev.totalReviews + 1,
        };
        saveStudyStats(newStats);
        return newStats;
      });
    },
    []
  );

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
      value={{ cards, stats, dueCards, addCards, reviewCard, toasts, showToast, dismissToast }}
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
