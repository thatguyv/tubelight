"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "success"> = {
  high: "destructive",
  medium: "warning",
  low: "success",
};

export function ActionsTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.actions);
  const [done, setDone] = React.useState<Record<number, boolean>>({});

  const actions = payload?.actions ?? [];

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

  return (
    <div className="space-y-2">
      {actions.map((a, i) => {
        const isDone = !!done[i];
        return (
          <Card
            key={i}
            className={cn(
              "flex items-start gap-3 p-4 transition",
              isDone && "opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition",
                isDone
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-input hover:border-brand",
              )}
              aria-label={isDone ? "Mark as not done" : "Mark as done"}
            >
              {isDone && <Check className="size-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm leading-snug", isDone && "line-through")}>{a.text}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant={PRIORITY_VARIANT[a.priority] ?? "default"}>
                  {a.priority}
                </Badge>
                {a.category && <Badge variant="outline">{a.category}</Badge>}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
