"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";

export function SummaryTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.summary);
  const data = payload?.summary;

  const detailedFormatted = React.useMemo(
    () => (data?.detailed ? prettifyDetailed(data.detailed) : ""),
    [data?.detailed],
  );

  if (!data) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-brand/30 bg-brand/5 p-5">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="brand">TL;DR</Badge>
        </div>
        <p className="text-base leading-relaxed">{data.tldr}</p>
      </Card>

      {data.bullets?.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Key points
          </h3>
          <ul className="space-y-2">
            {data.bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Detailed summary
        </h3>
        <div
          className="
            prose prose-sm max-w-prose dark:prose-invert
            prose-p:my-3 prose-p:leading-relaxed
            prose-headings:mt-6 prose-headings:mb-2 prose-headings:first:mt-0
            prose-h3:text-sm prose-h3:font-semibold prose-h3:uppercase prose-h3:tracking-wider
            prose-h3:text-brand
            prose-strong:font-semibold
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailedFormatted}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}

/**
 * Make any single-blob summary readable:
 *  - normalize line endings
 *  - if there are NO blank lines, split into paragraphs of ~3 sentences each
 *  - collapse runs of 3+ blank lines down to 2
 */
function prettifyDetailed(raw: string): string {
  const trimmed = raw.trim().replace(/\r\n/g, "\n");
  const hasParagraphBreaks = /\n\s*\n/.test(trimmed);
  const hasHeadings = /(^|\n)#{1,6}\s+/.test(trimmed);

  if (hasParagraphBreaks || hasHeadings) {
    return trimmed.replace(/\n{3,}/g, "\n\n");
  }

  // No structure — split into 3-sentence paragraphs.
  const sentences = trimmed.match(/[^.!?]+[.!?]+["')\]]*\s*/g) ?? [trimmed];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join("").trim());
  }
  return paragraphs.filter(Boolean).join("\n\n");
}
