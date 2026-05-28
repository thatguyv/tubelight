import { NextResponse } from "next/server";
import { fetchVideoTranscript, getVideoMeta, parseVideoId } from "@/lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        { error: "This video has no captions available. Try a different video." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      meta: { ...meta, durationSec: Math.round(transcript.totalDurationSec) },
      transcript,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcript";
    const isCaptionMissing =
      /caption|disabled|transcript|unavailable/i.test(message);
    return NextResponse.json(
      {
        error: isCaptionMissing
          ? "No captions are available for this video. Try a video with subtitles enabled."
          : `Could not fetch transcript: ${message}`,
      },
      { status: isCaptionMissing ? 422 : 500 },
    );
  }
}
