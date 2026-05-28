import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { NotesPayload } from "./types";

/** Encode a NotesPayload into a compact URL-safe string suitable for the `#data=` fragment. */
export function encodePayload(payload: NotesPayload): string {
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodePayload(encoded: string): NotesPayload | null {
  if (!encoded) return null;
  try {
    const raw = decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    return JSON.parse(raw) as NotesPayload;
  } catch {
    return null;
  }
}

export function buildShareUrl(origin: string, payload: NotesPayload): string {
  const encoded = encodePayload(payload);
  return `${origin}/share#data=${encoded}`;
}
