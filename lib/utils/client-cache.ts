type CacheEntry<T> = {
  data: T;
  ts: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

function storageKey(key: string) {
  return `vocab-cache:${key}`;
}

export function getClientCache<T>(key: string, maxAgeMs: number): T | null {
  const now = Date.now();
  const inMemory = memoryCache.get(key) as CacheEntry<T> | undefined;

  if (inMemory && now - inMemory.ts <= maxAgeMs) {
    return inMemory.data;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (now - parsed.ts > maxAgeMs) {
      window.sessionStorage.removeItem(storageKey(key));
      return null;
    }
    memoryCache.set(key, parsed as CacheEntry<unknown>);
    return parsed.data;
  } catch {
    return null;
  }
}

export function setClientCache<T>(key: string, data: T) {
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  memoryCache.set(key, entry as CacheEntry<unknown>);

  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore storage quota and serialization failures.
  }
}

export function clearClientCache(key: string) {
  memoryCache.delete(key);

  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(key));
  } catch {
    // Ignore storage failures.
  }
}
