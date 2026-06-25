"use client";

import {
  clearLegacyStorage,
  loadLegacyCards,
  loadLegacyStats,
} from "@/lib/storage/legacy-local-storage";

export async function migrateLegacyLocalData() {
  const cards = loadLegacyCards();
  const stats = loadLegacyStats();

  if (cards.length === 0) {
    return { insertedCount: 0, duplicatesSkipped: 0, migrated: false };
  }

  const res = await fetch("/api/migrate/local", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards, stats }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Khong the chuyen du lieu local");
  }

  const data = (await res.json()) as {
    insertedCount: number;
    duplicatesSkipped: number;
  };
  clearLegacyStorage();
  return { ...data, migrated: true };
}
