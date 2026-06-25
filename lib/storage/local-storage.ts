import { VocabularyCard, StudyStats } from "@/types/vocab";

const CARDS_KEY = "vocab_cards";
const STATS_KEY = "study_stats";

export function loadCards(): VocabularyCard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCards(cards: VocabularyCard[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
}

export function loadStudyStats(): StudyStats {
  if (typeof window === "undefined") return { streak: 0, totalReviews: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : { streak: 0, totalReviews: 0 };
  } catch {
    return { streak: 0, totalReviews: 0 };
  }
}

export function saveStudyStats(stats: StudyStats): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}
