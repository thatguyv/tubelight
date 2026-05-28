"use client";

import { useNotesStore } from "@/store/notes";

interface SampleChipProps {
  url: string;
  label: string;
}

export function SampleChip({ url, label }: SampleChipProps) {
  const requestUrl = useNotesStore((s) => s.requestUrl);
  return (
    <button
      type="button"
      onClick={() => requestUrl(url)}
      className="rounded-full border bg-card px-3 py-1 transition hover:border-brand/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </button>
  );
}
