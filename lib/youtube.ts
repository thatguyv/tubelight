import "server-only";
import type { TranscriptResult, TranscriptSegment, VideoMeta } from "./types";
import { canonicalUrl, thumbnailUrl } from "./youtube-id";

export { parseVideoId, canonicalUrl, thumbnailUrl } from "./youtube-id";

// ─── Supadata API ─────────────────────────────────────────────────────────────

interface SupadataSegment {
  text: string;
  offset: number;   // ms
  duration: number; // ms
  lang?: string;
}

interface SupadataResponse {
  content: SupadataSegment[];
  lang: string;
  availableLangs?: string[];
  error?: string;
}

/**
 * Fetch transcript via Supadata (https://supadata.ai).
 * Requires SUPADATA_API_KEY env var.
 * Free tier: 100 transcripts/day — enough for a personal project.
 */
async function fetchViaSupadata(
  videoId: string,
  lang?: string,
): Promise<TranscriptSegment[]> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) throw new Error("SUPADATA_API_KEY not set");

  const url = new URL("https://api.supadata.ai/v1/youtube/transcript");
  url.searchParams.set("url", canonicalUrl(videoId));
  if (lang) url.searchParams.set("lang", lang);
  url.searchParams.set("text", "false"); // return structured segments

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as SupadataResponse;
    throw new Error(
      `Supadata API error ${res.status}: ${body.error ?? res.statusText}`,
    );
  }

  const data = (await res.json()) as SupadataResponse;

  return (data.content ?? []).map((s) => ({
    text: decodeEntities(s.text ?? ""),
    start: (s.offset ?? 0) / 1000,
    duration: (s.duration ?? 2000) / 1000,
  }));
}

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

// ─── Browser-like headers ────────────────────────────────────────────────────

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  // Bypass GDPR consent wall
  "Cookie": "CONSENT=YES+42; SOCS=CAESEwgDEgk0OTI5NzIxMjgaAmVuIAEaBgiA_LyaBg",
};

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: { simpleText?: string };
  vssId?: string;
}

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Array<{ utf8?: string }>;
}

// ─── JSON extraction helper ───────────────────────────────────────────────────

/**
 * Extracts the first complete JSON object that starts at `startIdx` in `html`.
 * Uses brace/bracket counting and properly skips over string literals so it
 * doesn't confuse a `{` or `}` inside a string for a structural brace.
 */
function extractJsonObject(html: string, startIdx: number): string | null {
  let depth = 0;
  let i = startIdx;
  const len = html.length;

  while (i < len) {
    const ch = html[i];
    if (ch === "{" || ch === "[") {
      depth++;
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) return html.slice(startIdx, i + 1);
    } else if (ch === '"') {
      // skip over string literal
      i++;
      while (i < len) {
        if (html[i] === "\\") { i += 2; continue; }
        if (html[i] === '"') break;
        i++;
      }
    }
    i++;
  }
  return null;
}

// ─── Direct page-fetch transcript fetcher ────────────────────────────────────

/**
 * Fetches the YouTube watch page, extracts the caption track list from
 * `ytInitialPlayerResponse`, picks the best language match, then fetches
 * the timedtext in JSON3 format.
 *
 * This approach works from cloud servers (Vercel, AWS) because it mimics a
 * normal browser page load rather than calling the Innertube API directly.
 */
async function fetchTranscriptViaBrowser(
  videoId: string,
  lang?: string,
): Promise<TranscriptSegment[]> {
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: BROWSER_HEADERS,
  });

  if (!pageRes.ok) {
    throw new Error(`YouTube watch page returned ${pageRes.status}`);
  }

  const html = await pageRes.text();

  // Extract ytInitialPlayerResponse
  const marker = "ytInitialPlayerResponse = ";
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) {
    // Might be a bot-check or consent page
    if (html.includes("consent.youtube.com") || html.includes("accounts.google.com")) {
      throw new Error("YouTube returned a consent/sign-in wall — 403 blocked from this server");
    }
    throw new Error("ytInitialPlayerResponse not found in page HTML");
  }

  const jsonStr = extractJsonObject(html, markerIdx + marker.length);
  if (!jsonStr) throw new Error("Could not extract ytInitialPlayerResponse JSON");

  let playerResponse: Record<string, unknown>;
  try {
    playerResponse = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse ytInitialPlayerResponse JSON");
  }

  // Check if the video is actually playable
  const playability = (playerResponse.playabilityStatus as Record<string, unknown> | undefined);
  const playStatus = playability?.status as string | undefined;
  if (playStatus && playStatus !== "OK" && playStatus !== "LIVE_STREAM_OFFLINE") {
    throw new Error(`Video not playable: ${playStatus} — ${(playability?.reason as string) ?? ""}`);
  }

  // Extract caption tracks
  const captionTracks = (
    (playerResponse.captions as Record<string, unknown> | undefined)
      ?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined
  )?.captionTracks as CaptionTrack[] | undefined;

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error("No caption tracks found — captions may be disabled for this video");
  }

  // Pick the best language match
  let track: CaptionTrack | undefined;
  if (lang) {
    track =
      captionTracks.find((t) => t.languageCode === lang) ??
      captionTracks.find((t) => t.languageCode.startsWith(lang)) ??
      captionTracks.find((t) => t.vssId === `.${lang}`) ??
      captionTracks[0];
  } else {
    // Prefer English auto-generated or manually created English, else first track
    track =
      captionTracks.find((t) => t.languageCode === "en" && t.vssId?.startsWith("a.")) ??
      captionTracks.find((t) => t.languageCode === "en") ??
      captionTracks[0];
  }

  if (!track?.baseUrl) throw new Error("Caption track has no baseUrl");

  // Fetch timedtext JSON3 format
  const timedtextRes = await fetch(`${track.baseUrl}&fmt=json3`, {
    headers: {
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      "Referer": `https://www.youtube.com/watch?v=${videoId}`,
    },
  });
  if (!timedtextRes.ok) throw new Error(`Timedtext fetch failed: ${timedtextRes.status}`);

  const data = (await timedtextRes.json()) as { events?: Json3Event[] };

  const segments: TranscriptSegment[] = (data.events ?? [])
    .filter((e) => e.segs && e.segs.length > 0 && e.tStartMs !== undefined)
    .map((e) => ({
      text: decodeEntities(
        e.segs!
          .map((s) => s.utf8 ?? "")
          .join("")
          .replace(/\n/g, " ")
          .trim(),
      ),
      start: (e.tStartMs ?? 0) / 1000,
      duration: (e.dDurationMs ?? 2000) / 1000,
    }))
    .filter((s) => s.text.length > 0);

  return segments;
}

// ─── Public fetch function ────────────────────────────────────────────────────

// When user picks "Auto-detect", try English first then any available language.
// This prevents non-English videos (with English + other tracks) from defaulting
// to a random language depending on track order.
const AUTO_LANG_PREFERENCE = ["en", undefined] as const;

export async function fetchVideoTranscript(
  videoId: string,
  lang?: string,
): Promise<TranscriptResult> {
  // If a specific language is requested, try only that language.
  // If auto-detect (undefined), iterate through preferred languages until one works.
  const attempts: (string | undefined)[] =
    lang ? [lang] : [...AUTO_LANG_PREFERENCE];

  let segments: TranscriptSegment[] | null = null;
  let lastError: unknown;
  let resolvedLang = lang ?? "en";

  for (const tryLang of attempts) {
    segments = null;

    // 1. Supadata (most reliable from cloud servers)
    if (process.env.SUPADATA_API_KEY) {
      try {
        segments = await fetchViaSupadata(videoId, tryLang);
        console.log(`[transcript] Supadata OK lang=${tryLang ?? "auto"} (${segments.length} segs)`);
      } catch (err) {
        lastError = err;
        console.warn(`[transcript] Supadata failed lang=${tryLang ?? "auto"}:`, String(err));
      }
    }

    // 2. Direct page-fetch fallback
    if (!segments || segments.length === 0) {
      try {
        segments = await fetchTranscriptViaBrowser(videoId, tryLang);
        console.log(`[transcript] page-fetch OK lang=${tryLang ?? "auto"} (${segments.length} segs)`);
      } catch (err) {
        lastError = err;
        console.warn(`[transcript] page-fetch failed lang=${tryLang ?? "auto"}:`, String(err));
      }
    }

    if (segments && segments.length > 0) {
      resolvedLang = tryLang ?? "en";
      break;
    }
  }

  if (!segments || segments.length === 0) {
    if (lastError) throw lastError;
    throw new Error("No caption tracks found for this video");
  }

  const last = segments[segments.length - 1];
  const totalDurationSec = last ? last.start + last.duration : 0;

  return {
    segments,
    language: resolvedLang,
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
