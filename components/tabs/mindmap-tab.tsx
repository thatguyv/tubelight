"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";
import type { MindMapNode } from "@/lib/types";

export function MindMapTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.mindmap);
  const root = payload?.mindmap;

  if (!root || (!root.label && !root.children?.length)) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No mind map yet."
      />
    );
  }

  return (
    <Card className="p-5">
      <Branch node={root} depth={0} />
    </Card>
  );
}

function Branch({ node, depth }: { node: MindMapNode; depth: number }) {
  const [open, setOpen] = React.useState(depth < 2);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className={cn(depth > 0 && "border-l border-dashed border-border pl-4")}>
      <button
        type="button"
        disabled={!hasChildren}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md py-1 pr-2 text-left text-sm transition",
          hasChildren && "hover:bg-accent",
          depth === 0 && "text-base font-semibold",
        )}
      >
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        ) : (
          <span className="ml-1 size-1.5 rounded-full bg-brand/70" />
        )}
        <span>{node.label}</span>
      </button>
      {open && hasChildren && (
        <div className="ml-2 mt-1 space-y-1">
          {node.children!.map((c, i) => (
            <Branch key={i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
