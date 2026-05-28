"use client";

import * as React from "react";
import { Check, Circle, Flag, ListChecks } from "lucide-react";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";
import type { ActionItem } from "@/lib/types";

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_STYLES: Record<
  string,
  { dot: string; label: string; chip: string }
> = {
  high: {
    dot: "bg-rose-500",
    label: "text-rose-500",
    chip: "bg-rose-500/10 text-rose-500 ring-rose-500/30",
  },
  medium: {
    dot: "bg-amber-500",
    label: "text-amber-500",
    chip: "bg-amber-500/10 text-amber-500 ring-amber-500/30",
  },
  low: {
    dot: "bg-emerald-500",
    label: "text-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-500 ring-emerald-500/30",
  },
};

function styleFor(priority: string) {
  return PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium;
}

interface Group {
  category: string;
  items: { item: ActionItem; originalIndex: number }[];
}

function groupByCategory(actions: ActionItem[]): Group[] {
  const map = new Map<string, Group>();
  actions.forEach((a, i) => {
    const cat = (a.category || "General").trim() || "General";
    if (!map.has(cat)) map.set(cat, { category: cat, items: [] });
    map.get(cat)!.items.push({ item: a, originalIndex: i });
  });
  // Within each group, sort by priority
  for (const g of map.values()) {
    g.items.sort(
      (a, b) =>
        (PRIORITY_RANK[a.item.priority] ?? 1) -
        (PRIORITY_RANK[b.item.priority] ?? 1),
    );
  }
  // Groups themselves sorted by their highest-priority item (high first)
  return Array.from(map.values()).sort(
    (a, b) =>
      (PRIORITY_RANK[a.items[0].item.priority] ?? 1) -
      (PRIORITY_RANK[b.items[0].item.priority] ?? 1),
  );
}

export function ActionsTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.actions);
  const [done, setDone] = React.useState<Record<number, boolean>>({});

  const actions = payload?.actions ?? [];
  const groups = React.useMemo(() => groupByCategory(actions), [actions]);

  if (actions.length === 0) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No action items yet."
      />
    );
  }

  const completedCount = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completedCount / actions.length) * 100);

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div className="flex items-center gap-3 rounded-xl border bg-card/50 p-3">
        <div className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
          <ListChecks className="size-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {completedCount} of {actions.length} completed
            </span>
            <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grouped action lists */}
      {groups.map((group) => (
        <section key={group.category} className="space-y-2">
          <header className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.category}
            </h3>
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.items.length} {group.items.length === 1 ? "task" : "tasks"}
            </span>
          </header>

          <div className="overflow-hidden rounded-xl border bg-card/30 divide-y divide-border">
            {group.items.map(({ item, originalIndex }) => {
              const isDone = !!done[originalIndex];
              const styles = styleFor(item.priority);
              return (
                <div
                  key={originalIndex}
                  className={cn(
                    "group flex items-start gap-3 p-3.5 transition",
                    "hover:bg-accent/50",
                    isDone && "opacity-55",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setDone((d) => ({ ...d, [originalIndex]: !d[originalIndex] }))
                    }
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition",
                      isDone
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-input group-hover:border-brand/60",
                    )}
                    aria-label={isDone ? "Mark as not done" : "Mark as done"}
                  >
                    {isDone ? (
                      <Check className="size-3" />
                    ) : (
                      <Circle className="size-2.5 fill-transparent opacity-0" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {item.text}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
                      styles.chip,
                    )}
                    title={`${item.priority} priority`}
                  >
                    <Flag className={cn("size-2.5", styles.label)} />
                    {item.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
