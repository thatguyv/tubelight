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

export async function fetchTranscript(url: string, lang?: string): Promise<TranscriptResponse> {
  const res = await fetch("/api/transcript", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, lang }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? "Failed to fetch transcript");
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
