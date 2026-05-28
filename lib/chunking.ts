import type { TranscriptSegment } from "./types";
import { formatTime } from "./utils";

/** Rough char-per-token estimate for English. */
const CHARS_PER_TOKEN = 4;
/** Target input window for a single LLM call (in tokens). */
const TARGET_CHUNK_TOKENS = 5500;
/** Overlap between chunks (in tokens). */
const OVERLAP_TOKENS = 250;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function formatTranscriptWithTimestamps(
  segments: TranscriptSegment[],
  every = 30,
): string {
  let lastStamp = -Infinity;
  const lines: string[] = [];
  for (const seg of segments) {
    if (seg.start - lastStamp >= every) {
      lines.push(`[${formatTime(seg.start)}] ${seg.text}`);
      lastStamp = seg.start;
    } else {
      lines.push(seg.text);
    }
  }
  return lines.join(" ");
}

export interface TranscriptChunk {
  index: number;
  text: string;
  startSec: number;
  endSec: number;
}

/**
 * Split the transcript into overlapping windows of roughly TARGET_CHUNK_TOKENS,
 * each tagged with the wall-clock time range.
 */
export function chunkTranscript(segments: TranscriptSegment[]): TranscriptChunk[] {
  if (segments.length === 0) return [];

  const targetChars = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN;

  const chunks: TranscriptChunk[] = [];
  let buf: TranscriptSegment[] = [];
  let bufLen = 0;
  let chunkStart = segments[0].start;

  const flush = () => {
    if (buf.length === 0) return;
    const text = formatTranscriptWithTimestamps(buf);
    const last = buf[buf.length - 1];
    chunks.push({
      index: chunks.length,
      text,
      startSec: chunkStart,
      endSec: last.start + last.duration,
    });
  };

  for (const seg of segments) {
    if (bufLen + seg.text.length > targetChars && buf.length > 0) {
      flush();
      // start next chunk with overlap from the tail of the previous one
      let overlap: TranscriptSegment[] = [];
      let overlapLen = 0;
      for (let i = buf.length - 1; i >= 0 && overlapLen < overlapChars; i--) {
        overlap.unshift(buf[i]);
        overlapLen += buf[i].text.length;
      }
      buf = overlap;
      bufLen = overlapLen;
      chunkStart = overlap[0]?.start ?? seg.start;
    }
    buf.push(seg);
    bufLen += seg.text.length + 1;
  }
  flush();
  return chunks;
}

export function shouldChunk(segments: TranscriptSegment[]): boolean {
  const totalChars = segments.reduce((acc, s) => acc + s.text.length, 0);
  return Math.ceil(totalChars / CHARS_PER_TOKEN) > TARGET_CHUNK_TOKENS * 1.5;
}
