import "server-only";
import { fetchTranscript } from "youtube-transcript-plus";
import type { TranscriptResult, TranscriptSegment, VideoMeta } from "./types";
import { canonicalUrl, thumbnailUrl } from "./youtube-id";

export { parseVideoId, canonicalUrl, thumbnailUrl } from "./youtube-id";

export async function fetchOEmbed(videoId: string): Promise<Partial<VideoMeta>> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl(videoId))}&format=json`,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!res.ok) return {};
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      author_url?: string;
      thumbnail_url?: string;
    };
    return {
      title: data.title,
      author: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url ?? thumbnailUrl(videoId),
    };
  } catch {
    return {};
  }
}

const USER_AGENTS = [
  // Recent Chrome on macOS
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  // Recent Chrome on Windows
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  // iPhone Safari
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
];

export async function fetchVideoTranscript(
  videoId: string,
  lang?: string,
): Promise<TranscriptResult> {
  let lastError: unknown = null;
  let raw: Awaited<ReturnType<typeof fetchTranscript>> | null = null;

  // Try each user-agent in turn — helps when YouTube starts blocking a specific UA
  for (const userAgent of USER_AGENTS) {
    try {
      raw = await fetchTranscript(videoId, {
        lang,
        retries: 2,
        retryDelay: 1000,
        userAgent,
      });
      if (raw && raw.length > 0) break;
    } catch (err) {
      lastError = err;
      // small jitter before next UA attempt
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (!raw || raw.length === 0) {
    if (lastError) throw lastError;
    return { segments: [], language: lang ?? "en", fullText: "", totalDurationSec: 0 };
  }

  const segments: TranscriptSegment[] = raw.map((r) => ({
    text: decodeEntities(r.text ?? ""),
    start: typeof r.offset === "number" ? r.offset : 0,
    duration: typeof r.duration === "number" ? r.duration : 0,
  }));

  const language = (raw[0] && "lang" in raw[0] ? (raw[0] as { lang?: string }).lang : undefined) ?? lang ?? "en";
  const last = segments[segments.length - 1];
  const totalDurationSec = last ? last.start + last.duration : 0;

  return {
    segments,
    language,
    fullText: segments.map((s) => s.text).join(" "),
    totalDurationSec,
  };
}

export async function getVideoMeta(videoId: string): Promise<VideoMeta> {
  const partial = await fetchOEmbed(videoId);
  return {
    videoId,
    title: partial.title ?? "Untitled video",
    author: partial.author ?? "Unknown",
    authorUrl: partial.authorUrl,
    thumbnailUrl: partial.thumbnailUrl ?? thumbnailUrl(videoId),
    url: canonicalUrl(videoId),
  };
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&#39;": "'",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|#39|apos|quot|lt|gt|nbsp);/g, (m) => ENTITIES[m] ?? m);
}
