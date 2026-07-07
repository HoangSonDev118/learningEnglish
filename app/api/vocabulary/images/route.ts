import { NextRequest, NextResponse } from "next/server";

type WikiSummaryResponse = {
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
};

function normalizeWord(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isHttpsImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("https://");
}

async function fetchWikiImage(word: string): Promise<string | null> {
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word)}`;
  const res = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AppHocTA/1.0 (review-illustration)",
    },
    cache: "force-cache",
  });

  if (!res.ok) return null;

  const data = (await res.json().catch(() => ({}))) as WikiSummaryResponse;
  const url = data.thumbnail?.source ?? data.originalimage?.source;
  return isHttpsImageUrl(url) ? url : null;
}

export async function GET(req: NextRequest) {
  try {
    const rawWord = req.nextUrl.searchParams.get("word") ?? "";
    const word = normalizeWord(rawWord);

    if (!word) {
      return NextResponse.json({ error: "Thiếu từ cần lấy ảnh" }, { status: 400 });
    }

    const fallbackWord = word.split(" ")[0]?.trim() ?? "";
    const candidates = Array.from(new Set([word, fallbackWord].filter(Boolean)));

    for (const candidate of candidates) {
      const imageUrl = await fetchWikiImage(candidate);
      if (imageUrl) {
        return NextResponse.json({ imageUrl });
      }
    }

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lấy ảnh minh họa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
