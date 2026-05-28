"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, History as HistoryIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteNotes, listHistory, type HistoryEntry } from "@/lib/history";
import { formatTime } from "@/lib/utils";

export function HistoryList() {
  const [entries, setEntries] = React.useState<HistoryEntry[] | null>(null);

  const refresh = React.useCallback(async () => {
    const list = await listHistory();
    setEntries(list);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function onDelete(videoId: string) {
    await deleteNotes(videoId);
    refresh();
  }

  if (entries === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <HistoryIcon className="mx-auto mb-2 size-6 opacity-50" />
        Your generated notes will appear here.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const sectionCount = countSections(e);
        return (
          <li
            key={e.id}
            className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition hover:border-brand/40 hover:shadow-md"
          >
            <Link
              href={`/notes/${e.videoId}`}
              className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={e.meta.thumbnailUrl}
                alt={e.meta.title}
                fill
                sizes="112px"
                className="object-cover transition group-hover:scale-105"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/notes/${e.videoId}`}
                className="line-clamp-2 text-sm font-medium leading-snug hover:text-brand"
              >
                {e.meta.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="line-clamp-1">{e.meta.author}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {e.meta.durationSec ? formatTime(e.meta.durationSec) : "—"}
                </span>
                {sectionCount > 0 && (
                  <Badge variant="brand" className="text-[10px]">
                    {sectionCount} sections
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              onClick={() => onDelete(e.videoId)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function countSections(e: HistoryEntry): number {
  let n = 0;
  if (e.payload.summary) n++;
  if (e.payload.chapters?.length) n++;
  if (e.payload.flashcards?.length) n++;
  if (e.payload.actions?.length) n++;
  if (e.payload.quiz?.length) n++;
  if (e.payload.mindmap) n++;
  if (e.payload.quotes?.length) n++;
  return n;
}
