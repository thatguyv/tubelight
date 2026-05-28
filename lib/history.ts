import { get, set, del, keys } from "idb-keyval";
import type { NotesPayload, VideoMeta } from "./types";

const HISTORY_PREFIX = "notes:";

export interface HistoryEntry {
  id: string;
  videoId: string;
  meta: VideoMeta;
  createdAt: number;
  updatedAt: number;
  payload: NotesPayload;
}

export function makeHistoryId(videoId: string): string {
  return `${HISTORY_PREFIX}${videoId}`;
}

export async function saveNotes(payload: NotesPayload): Promise<HistoryEntry> {
  const id = makeHistoryId(payload.meta.videoId);
  const now = Date.now();
  const existing = (await get(id)) as HistoryEntry | undefined;
  const entry: HistoryEntry = {
    id,
    videoId: payload.meta.videoId,
    meta: payload.meta,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    payload,
  };
  await set(id, entry);
  return entry;
}

export async function loadNotes(videoId: string): Promise<HistoryEntry | undefined> {
  return (await get(makeHistoryId(videoId))) as HistoryEntry | undefined;
}

export async function deleteNotes(videoId: string): Promise<void> {
  await del(makeHistoryId(videoId));
}

export async function listHistory(): Promise<HistoryEntry[]> {
  const allKeys = await keys();
  const wantedKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith(HISTORY_PREFIX),
  );
  const entries = await Promise.all(
    wantedKeys.map((k) => get(k) as Promise<HistoryEntry | undefined>),
  );
  return entries
    .filter((e): e is HistoryEntry => Boolean(e))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}
