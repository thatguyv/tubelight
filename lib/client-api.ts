"use client";

import type {
  NotesPayload,
  SectionEvent,
  SectionId,
  TranscriptResult,
  VideoMeta,
} from "./types";

export interface TranscriptResponse {
  meta: VideoMeta;
  transcript: TranscriptResult;
}

export class TranscriptFetchError extends Error {
  reason?: string;
  status?: number;
  constructor(message: string, opts: { reason?: string; status?: number } = {}) {
    super(message);
    this.name = "TranscriptFetchError";
    this.reason = opts.reason;
    this.status = opts.status;
  }
}

export async function fetchTranscript(url: string, lang?: string): Promise<TranscriptResponse> {
  const res = await fetch("/api/transcript", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, lang }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new TranscriptFetchError(data?.error ?? "Failed to fetch transcript", {
      reason: data?.reason,
      status: res.status,
    });
  }
  return data as TranscriptResponse;
}

export async function fetchManualTranscript(
  url: string,
  text: string,
): Promise<TranscriptResponse> {
  const res = await fetch("/api/transcript-manual", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, text }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to parse pasted transcript");
  }
  return data as TranscriptResponse;
}

export async function streamGenerate(
  body: {
    meta: VideoMeta;
    transcript: NotesPayload["transcript"];
    sections?: SectionId[];
    outputLanguage?: string;
  },
  onEvent: (ev: SectionEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Generate request failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as SectionEvent);
      } catch {
        // ignore malformed lines
      }
    }
  }
  const tail = buf.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as SectionEvent);
    } catch {
      // ignore
    }
  }
}

export async function streamChat(
  body: {
    meta: VideoMeta;
    transcript: NotesPayload["transcript"];
    messages: { role: "user" | "assistant"; content: string }[];
    outputLanguage?: string;
  },
  onToken: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Chat request failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}
