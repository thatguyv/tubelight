"use client";

import { Quote, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { formatTime } from "@/lib/utils";

export function QuotesTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.quotes);
  const seekTo = useNotesStore((s) => s.seekTo);
  const quotes = payload?.quotes ?? [];

  if (quotes.length === 0) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No quotes yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((q, i) => (
        <Card key={i} className="relative overflow-hidden p-5">
          <Quote className="absolute right-3 top-3 size-6 text-brand/15" />
          <p className="text-base italic leading-relaxed">&ldquo;{q.text}&rdquo;</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => seekTo(q.start)}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono hover:bg-brand hover:text-brand-foreground"
            >
              <Play className="size-3" /> {formatTime(q.start)}
            </button>
            {q.speaker && <span>— {q.speaker}</span>}
            {q.context && (
              <span className="line-clamp-1 max-w-[80%]">· {q.context}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
