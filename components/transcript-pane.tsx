"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNotesStore } from "@/store/notes";
import { cn, formatTime } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/types";

interface TranscriptPaneProps {
  segments: TranscriptSegment[];
}

export function TranscriptPane({ segments }: TranscriptPaneProps) {
  const [q, setQ] = React.useState("");
  const currentTimeSec = useNotesStore((s) => s.currentTimeSec);
  const seekTo = useNotesStore((s) => s.seekTo);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    if (!q.trim()) return segments;
    const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return segments.filter((s) => re.test(s.text));
  }, [segments, q]);

  const activeIdx = React.useMemo(() => {
    for (let i = filtered.length - 1; i >= 0; i--) {
      if (filtered[i].start <= currentTimeSec) return i;
    }
    return -1;
  }, [filtered, currentTimeSec]);

  React.useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      const parentRect = listRef.current.getBoundingClientRect();
      if (rect.top < parentRect.top + 40 || rect.bottom > parentRect.bottom - 40) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeIdx]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card">
      <div className="border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transcript..."
            className="h-9 pl-9"
          />
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 text-sm">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground">No matches.</p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((s, i) => (
              <li key={`${s.start}-${i}`} data-idx={i}>
                <button
                  type="button"
                  onClick={() => seekTo(s.start)}
                  className={cn(
                    "group flex w-full gap-2 rounded-lg p-2 text-left transition",
                    "hover:bg-accent",
                    i === activeIdx && "bg-brand/10 ring-1 ring-brand/30",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs",
                      i === activeIdx
                        ? "bg-brand text-brand-foreground"
                        : "bg-muted text-muted-foreground group-hover:bg-background",
                    )}
                  >
                    {formatTime(s.start)}
                  </span>
                  <span className="leading-snug">{s.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
