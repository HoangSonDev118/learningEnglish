import { NextRequest, NextResponse } from "next/server";

type WikiSummaryResponse = {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

type WikiPageImageResponse = {
  query?: {
    pages?: Record<string, { thumbnail?: { source?: string }; original?: { source?: string } }>;
  };
};

type WikiSearchResponse = {
  query?: {
    search?: Array<{ title?: string }>;
  };
};

type PexelsSearchResponse = {
  photos?: Array<{
    src?: {
      large2x?: string;
      large?: string;
      medium?: string;
    };
  }>;
};

const REQUEST_TIMEOUT_MS = 4500;
const RETRY_ATTEMPTS = 2;

function normalizeWord(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function simplifyWord(input: string): string {
  return input
    .replace(/\([^)]*\)/g, " ")
    .replace(/[.,;:!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttpsImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://");
}

function getUniqueCandidates(word: string): string[] {
  const simplified = simplifyWord(word);
  const firstToken = simplified.split(" ")[0]?.trim() ?? "";
  return Array.from(new Set([word, simplified, firstToken].filter(Boolean)));
}

async function fetchJsonWithRetry<T>(endpoint: string): Promise<T | null> {
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AppHocTA/1.0 (review-illustration)",
        },
        cache: "force-cache",
        signal: controller.signal,
      });

      if (!res.ok) {
        if (attempt === RETRY_ATTEMPTS - 1) {
          return null;
        }
        continue;
      }

      return (await res.json().catch(() => null)) as T | null;
    } catch {
      if (attempt === RETRY_ATTEMPTS - 1) {
        return null;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

async function fetchWikiImage(word: string): Promise<string | null> {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`;
  const data = await fetchJsonWithRetry<WikiSummaryResponse>(endpoint);
  if (!data) return null;
  const url = data.thumbnail?.source ?? data.originalimage?.source;
  return isHttpsImageUrl(url) ? url : null;
}

async function fetchWikiPageImage(word: string): Promise<string | null> {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original|thumbnail&pithumbsize=1200&redirects=1&titles=${encodeURIComponent(word)}`;
  const data = await fetchJsonWithRetry<WikiPageImageResponse>(endpoint);
  const pages = data?.query?.pages;
  if (!pages) return null;

  const candidates = Object.values(pages);
  for (const page of candidates) {
    const url = page.original?.source ?? page.thumbnail?.source;
    if (isHttpsImageUrl(url)) return url;
  }

  return null;
}

async function searchWikiTitles(word: string): Promise<string[]> {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(word)}&srlimit=5&srprop=`;
  const data = await fetchJsonWithRetry<WikiSearchResponse>(endpoint);
  const titles = data?.query?.search?.map((item) => item.title?.trim() ?? "").filter(Boolean);
  return Array.from(new Set(titles ?? []));
}

async function fetchPexelsImage(word: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=1&orientation=landscape`;

  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          Authorization: apiKey,
          "User-Agent": "AppHocTA/1.0 (review-illustration)",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        if (attempt === RETRY_ATTEMPTS - 1) {
          return null;
        }
        continue;
      }

      const data = (await res.json().catch(() => null)) as PexelsSearchResponse | null;
      const photo = data?.photos?.[0];
      const url = photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.medium;
      return isHttpsImageUrl(url) ? url : null;
    } catch {
      if (attempt === RETRY_ATTEMPTS - 1) {
        return null;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

async function resolveIllustration(word: string): Promise<string | null> {
  const baseCandidates = getUniqueCandidates(word);

  for (const candidate of baseCandidates) {
    const imageFromSummary = await fetchWikiImage(candidate);
    if (imageFromSummary) return imageFromSummary;

    const imageFromPageImages = await fetchWikiPageImage(candidate);
    if (imageFromPageImages) return imageFromPageImages;
  }

  for (const candidate of baseCandidates) {
    const searchTitles = await searchWikiTitles(candidate);
    for (const title of searchTitles) {
      const imageFromTitleSummary = await fetchWikiImage(title);
      if (imageFromTitleSummary) return imageFromTitleSummary;

      const imageFromTitlePageImages = await fetchWikiPageImage(title);
      if (imageFromTitlePageImages) return imageFromTitlePageImages;
    }
  }

  for (const candidate of baseCandidates) {
    const imageFromPexels = await fetchPexelsImage(candidate);
    if (imageFromPexels) return imageFromPexels;
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const rawWord = req.nextUrl.searchParams.get("word") ?? "";
    const word = normalizeWord(rawWord);

    if (!word) {
      return NextResponse.json({ error: "Thiếu từ cần lấy ảnh" }, { status: 400 });
    }

    const imageUrl = await resolveIllustration(word);
    if (imageUrl) {
      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lấy ảnh minh họa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
