"use client";

import { Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn, formatTime } from "@/lib/utils";

export function ChaptersTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.chapters);
  const currentTimeSec = useNotesStore((s) => s.currentTimeSec);
  const seekTo = useNotesStore((s) => s.seekTo);
  const chapters = payload?.chapters;

  if (!chapters || chapters.length === 0) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No chapters yet."
      />
    );
  }

  return (
    <div className="space-y-3">
      {chapters.map((c, i) => {
        const isActive = currentTimeSec >= c.start && currentTimeSec < c.end;
        return (
          <Card
            key={i}
            className={cn(
              "overflow-hidden border-l-4 p-4 transition",
              isActive ? "border-l-brand bg-brand/5" : "border-l-transparent",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => seekTo(c.start)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 font-mono text-xs hover:bg-brand hover:text-brand-foreground"
                    aria-label={`Jump to ${formatTime(c.start)}`}
                  >
                    <Play className="size-3" />
                    {formatTime(c.start)}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(c.end - c.start)}
                  </span>
                  {isActive && <Badge variant="brand">Now playing</Badge>}
                </div>
                <h3 className="mt-2 text-base font-semibold leading-snug">{c.title}</h3>
                {c.bullets?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.bullets.map((b, j) => (
                      <li key={j} className="flex gap-2 text-muted-foreground">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
