"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  skeletonRows?: number;
}

export function SectionStatus({
  loading,
  error,
  empty,
  emptyMessage = "Nothing generated yet.",
  className,
  skeletonRows = 4,
}: Props) {
  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Generating...
        </div>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div
            key={i}
            className="h-4 rounded-md shimmer"
            style={{ width: `${60 + ((i * 13) % 35)}%` }}
          />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm",
          className,
        )}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Generation failed</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }
  if (empty) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyMessage}
      </div>
    );
  }
  return null;
}
