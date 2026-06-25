import { StudyStats, VocabularyCard } from "@/types/vocab";

const CARDS_KEY = "vocab_cards";
const STATS_KEY = "study_stats";

export function loadLegacyCards(): VocabularyCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? (JSON.parse(raw) as VocabularyCard[]) : [];
  } catch {
    return [];
  }
}

export function loadLegacyStats(): StudyStats | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? (JSON.parse(raw) as StudyStats) : null;
  } catch {
    return null;
  }
}

export function clearLegacyStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CARDS_KEY);
  localStorage.removeItem(STATS_KEY);
}
