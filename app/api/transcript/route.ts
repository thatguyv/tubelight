import { NextResponse } from "next/server";
import { fetchVideoTranscript, getVideoMeta, parseVideoId } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ErrorCategory {
  status: number;
  userMessage: string;
  reason: "no-captions" | "captions-disabled" | "video-unavailable" | "blocked" | "unknown";
}

function categorizeError(err: unknown): ErrorCategory {
  const message = err instanceof Error ? err.message : String(err);
  const errName = err instanceof Error ? err.name : "";
  const lower = message.toLowerCase();

  // Captions explicitly disabled by uploader
  if (/disabled|TranscriptsDisabled|transcript.*disabled/i.test(message)) {
    return {
      status: 422,
      reason: "captions-disabled",
      userMessage: "The uploader has disabled captions for this video.",
    };
  }
  // Video itself is private, deleted, age-gated, region-locked
  if (/VideoUnavailable|private|removed|not.?found|404/i.test(message)) {
    return {
      status: 422,
      reason: "video-unavailable",
      userMessage: "This video is unavailable (private, removed, age-restricted, or region-locked).",
    };
  }
  // YouTube blocking the request — most common when deployed to cloud datacenters
  if (
    /403|429|forbidden|rate.?limit|too many requests|blocked|consent|unusual traffic|sign in to confirm|429.+too/i.test(
      message,
    ) ||
    errName === "FetchError" ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND/i.test(message)
  ) {
    return {
      status: 503,
      reason: "blocked",
      userMessage:
        "YouTube is blocking transcript access from this server. This is common on cloud hosts. Tip: use the \"Paste transcript\" option below to provide one manually.",
    };
  }
  // Genuinely no caption tracks of any language
  if (/no.+(caption|subtitle|transcript)|caption.+not.+found|no tracks/i.test(lower)) {
    return {
      status: 422,
      reason: "no-captions",
      userMessage: "No captions are available for this video.",
    };
  }
  return {
    status: 500,
    reason: "unknown",
    userMessage: `Could not fetch transcript: ${message}`,
  };
}

export async function POST(req: Request) {
  let body: { url?: string; lang?: string };
  try {
    body = await req.json();
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

  try {
    const [meta, transcript] = await Promise.all([
      getVideoMeta(videoId),
      fetchVideoTranscript(videoId, body.lang),
    ]);

    if (transcript.segments.length === 0) {
      return NextResponse.json(
        {
          error: "No caption track returned. Try a different language, or paste a transcript manually.",
          reason: "no-captions",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      meta: { ...meta, durationSec: Math.round(transcript.totalDurationSec) },
      transcript,
    });
  } catch (err) {
    const cat = categorizeError(err);
    // Log full detail to Vercel runtime logs for debugging
    console.error("[/api/transcript] failed", {
      videoId,
      reason: cat.reason,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: cat.userMessage, reason: cat.reason },
      { status: cat.status },
    );
  }
}
