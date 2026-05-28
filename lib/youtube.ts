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

export async function fetchVideoTranscript(
  videoId: string,
  lang?: string,
): Promise<TranscriptResult> {
  const raw = await fetchTranscript(videoId, {
    lang,
    retries: 2,
    retryDelay: 800,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  const segments: TranscriptSegment[] = (raw ?? []).map((r) => ({
    text: decodeEntities(r.text ?? ""),
    start: typeof r.offset === "number" ? r.offset : 0,
    duration: typeof r.duration === "number" ? r.duration : 0,
  }));

  const language = (raw?.[0] && "lang" in raw[0] ? (raw[0] as { lang?: string }).lang : undefined) ?? lang ?? "en";
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
