import { NextResponse } from "next/server";
import { getVideoMeta, parseVideoId } from "@/lib/youtube";
import type { TranscriptSegment } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ManualBody {
  url?: string;
  text?: string;
}

const TIMESTAMP_RE = /^\s*(?:\(|\[)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\)|\])?\s*[-–:]?\s*(.+)$/;

/**
 * Parse pasted transcript text. Supports common formats:
 *  - "0:23 some line"  /  "1:02:33 some line"
 *  - "[0:23] some line"
 *  - "0:23 - some line"
 *  - Plain paragraphs (timestamps will be evenly distributed)
 */
function parsePastedTranscript(raw: string): TranscriptSegment[] {
  const lines = raw
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const stamped: TranscriptSegment[] = [];
  for (const line of lines) {
    const m = line.match(TIMESTAMP_RE);
    if (!m) continue;
    const [, h, mm, ss, text] = m;
    const seconds = ss
      ? Number(h) * 3600 + Number(mm) * 60 + Number(ss)
      : Number(h) * 60 + Number(mm);
    if (Number.isFinite(seconds) && text) {
      stamped.push({ text: text.trim(), start: seconds, duration: 0 });
    }
  }

  if (stamped.length >= 3) {
    // backfill durations from gaps
    for (let i = 0; i < stamped.length; i++) {
      const next = stamped[i + 1];
      stamped[i].duration = next ? Math.max(1, next.start - stamped[i].start) : 5;
    }
    return stamped;
  }

  // Fallback: no timestamps detected. Split on sentences and distribute.
  const sentences = raw
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]+["')\]]*\s*/g)
    ?.map((s) => s.trim())
    .filter(Boolean) ?? [];

  if (sentences.length === 0) return [];

  // Assume average 0.4s per word; spread evenly
  let cursor = 0;
  return sentences.map((text) => {
    const words = text.split(/\s+/).length;
    const duration = Math.max(2, Math.round(words * 0.4));
    const seg: TranscriptSegment = { text, start: cursor, duration };
    cursor += duration;
    return seg;
  });
}

export async function POST(req: Request) {
  let body: ManualBody;
  try {
    body = (await req.json()) as ManualBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const videoId = parseVideoId(body.url ?? "");
  if (!videoId) {
    return NextResponse.json(
      { error: "Could not extract a YouTube video ID from that URL." },
      { status: 400 },
    );
  }

  const text = (body.text ?? "").trim();
  if (text.length < 50) {
    return NextResponse.json(
      { error: "Transcript looks too short. Paste at least a few sentences." },
      { status: 400 },
    );
  }

  const segments = parsePastedTranscript(text);
  if (segments.length === 0) {
    return NextResponse.json(
      { error: "Couldn't parse any text from that paste." },
      { status: 400 },
    );
  }

  const meta = await getVideoMeta(videoId);
  const last = segments[segments.length - 1];
  const totalDurationSec = last.start + last.duration;
  const fullText = segments.map((s) => s.text).join(" ");

  return NextResponse.json({
    meta: { ...meta, durationSec: Math.round(totalDurationSec) },
    transcript: { segments, language: "und", fullText, totalDurationSec },
  });
}
