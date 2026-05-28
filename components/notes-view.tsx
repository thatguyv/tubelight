"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { VideoEmbed } from "@/components/video-embed";
import { TranscriptPane } from "@/components/transcript-pane";
import { NotesTabs } from "@/components/notes-tabs";
import { ExportMenu } from "@/components/export-menu";
import { ShareButton } from "@/components/share-button";
import { useNotesStore } from "@/store/notes";
import { loadNotes, saveNotes } from "@/lib/history";
import { formatTime } from "@/lib/utils";
import type { NotesPayload } from "@/lib/types";

interface Props {
  videoId: string;
  readOnly?: boolean;
  hydrate?: NotesPayload | null;
}

export function NotesView({ videoId, readOnly = false, hydrate }: Props) {
  const payload = useNotesStore((s) => s.payload);
  const isGenerating = useNotesStore((s) => s.isGenerating);
  const progress = useNotesStore((s) => s.progress);
  const status = useNotesStore((s) => s.status);
  const setPayload = useNotesStore((s) => s.setPayload);

  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function hydrateFromStorage() {
      if (payload && payload.meta.videoId === videoId) {
        setLoading(false);
        return;
      }
      if (hydrate) {
        setPayload(hydrate);
        setLoading(false);
        return;
      }
      const entry = await loadNotes(videoId);
      if (cancelled) return;
      if (entry) {
        setPayload(entry.payload);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }
    hydrateFromStorage();
    return () => {
      cancelled = true;
    };
  }, [videoId, hydrate, payload, setPayload]);

  // Persist on every change while generating
  React.useEffect(() => {
    if (readOnly || !payload || payload.meta.videoId !== videoId) return;
    const id = setTimeout(() => {
      saveNotes(payload).catch(() => undefined);
    }, 400);
    return () => clearTimeout(id);
  }, [payload, videoId, readOnly]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-xl font-semibold">These notes aren&apos;t on this device</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          They might have been generated on another browser, cleared, or never created here.
        </p>
        <Button asChild variant="brand" className="mt-6">
          <Link href={`/?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${videoId}`}>
            Generate now
          </Link>
        </Button>
      </div>
    );
  }

  if (!payload) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-1 no-print">
            <Link href="/">
              <ArrowLeft /> Home
            </Link>
          </Button>
          <h1 className="text-balance text-xl font-semibold leading-snug sm:text-2xl">
            {payload.meta.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <a
              href={payload.meta.authorUrl ?? payload.meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {payload.meta.author}
            </a>
            {payload.meta.durationSec ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" /> {formatTime(payload.meta.durationSec)}
                </span>
              </>
            ) : null}
            <span>·</span>
            <a
              href={payload.meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              Watch on YouTube <ExternalLink className="size-3" />
            </a>
            {readOnly && <Badge variant="outline">Shared (read-only)</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <ShareButton payload={payload} />
          <ExportMenu payload={payload} />
        </div>
      </div>

      {isGenerating && (
        <div className="mb-4 space-y-2 rounded-xl border bg-card p-3 no-print">
          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {status || "Generating..."}
            </span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-3 lg:sticky lg:top-16 lg:self-start">
          <VideoEmbed videoId={payload.meta.videoId} />
          <div className="h-[400px] lg:h-[calc(100vh-340px)] lg:min-h-[320px]">
            <TranscriptPane segments={payload.transcript} />
          </div>
        </div>

        <div className="min-w-0">
          <NotesTabs />
        </div>
      </div>
    </div>
  );
}
