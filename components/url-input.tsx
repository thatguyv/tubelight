"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseVideoId, canonicalUrl } from "@/lib/youtube-id";
import {
  fetchManualTranscript,
  fetchTranscript,
  streamGenerate,
  TranscriptFetchError,
  type TranscriptResponse,
} from "@/lib/client-api";
import { saveNotes } from "@/lib/history";
import { useNotesStore } from "@/store/notes";
import type { NotesPayload, SectionId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ManualTranscriptDialog } from "@/components/manual-transcript-dialog";

const LANG_OPTIONS = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
];

const OUTPUT_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Hindi", label: "Hindi" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "Chinese", label: "Chinese" },
];

const ALL_SECTIONS: SectionId[] = [
  "summary",
  "chapters",
  "flashcards",
  "actions",
  "quiz",
  "mindmap",
  "quotes",
];

interface UrlInputProps {
  initialUrl?: string;
  compact?: boolean;
}

export function UrlInput({ initialUrl = "", compact = false }: UrlInputProps) {
  const router = useRouter();
  const [url, setUrl] = React.useState(initialUrl);
  const [lang, setLang] = React.useState<string>("auto");
  const [outputLanguage, setOutputLanguage] = React.useState("English");
  const [status, setStatus] = React.useState<string>("");
  const [progress, setProgress] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [manualOpen, setManualOpen] = React.useState(false);
  const [manualBusy, setManualBusy] = React.useState(false);

  const store = useNotesStore();
  const pendingUrl = useNotesStore((s) => s.pendingUrl);
  const pendingUrlToken = useNotesStore((s) => s.pendingUrlToken);
  const clearPendingUrl = useNotesStore((s) => s.clearPendingUrl);
  const busyRef = React.useRef(false);

  React.useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const trimmed = url.trim();
  const detectedId = React.useMemo(() => parseVideoId(trimmed), [trimmed]);
  const hasInput = trimmed.length > 0;

  const generateFromTranscript = React.useCallback(
    async (tr: TranscriptResponse) => {
      const videoId = tr.meta.videoId;
      const payload: NotesPayload = {
        meta: tr.meta,
        language: tr.transcript.language,
        outputLanguage,
        createdAt: Date.now(),
        transcript: tr.transcript.segments,
      };
      store.setPayload(payload);
      store.setProgress(20);
      store.setStatus("Generating notes...");
      router.push(`/notes/${videoId}`);

      ALL_SECTIONS.forEach((s) => store.setSectionLoading(s, true));

      await streamGenerate(
        {
          meta: tr.meta,
          transcript: tr.transcript.segments,
          sections: ALL_SECTIONS,
          outputLanguage,
        },
        (ev) => {
          if (ev.type === "section" && ev.id) {
            store.setSection(ev.id, ev.data as never);
            if (typeof ev.progress === "number") store.setProgress(20 + ev.progress * 0.8);
          } else if (ev.type === "error" && ev.id) {
            store.setSectionError(ev.id, ev.message ?? "Generation failed");
          } else if (ev.type === "status") {
            if (ev.message) store.setStatus(ev.message);
          } else if (ev.type === "done") {
            store.setProgress(100);
            store.setStatus("Done");
            store.setGenerating(false);
          }
        },
      );

      const finalPayload = useNotesStore.getState().payload;
      if (finalPayload) {
        await saveNotes(finalPayload);
      }
      toast.success("Notes generated", { description: tr.meta.title });
    },
    [outputLanguage, router, store],
  );

  const runSubmit = React.useCallback(
    async (rawUrl: string) => {
      const target = rawUrl.trim();
      if (busyRef.current || !target) return;
      const videoId = parseVideoId(target);
      if (!videoId) {
        setErrorMsg(
          "That doesn't look like a YouTube link. Paste a URL like https://youtu.be/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID",
        );
        return;
      }
      setErrorMsg(null);
      setBusy(true);
      busyRef.current = true;
      setProgress(5);
      setStatus("Fetching transcript...");

      store.reset();
      store.setGenerating(true);
      store.setProgress(5);
      store.setStatus("Fetching transcript...");

      try {
        const tr = await fetchTranscript(target, lang === "auto" ? undefined : lang);
        setProgress(20);
        setStatus("Transcript ready. Generating notes...");
        await generateFromTranscript(tr);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        const reason =
          err instanceof TranscriptFetchError ? err.reason : undefined;
        setErrorMsg(message);
        store.setGenerating(false);
        // For blocked/no-captions/disabled cases, offer manual paste
        if (
          reason === "blocked" ||
          reason === "no-captions" ||
          reason === "captions-disabled"
        ) {
          setManualOpen(true);
        } else {
          toast.error("Failed to process video", { description: message });
        }
      } finally {
        setBusy(false);
        busyRef.current = false;
        setProgress(0);
        setStatus("");
      }
    },
    [generateFromTranscript, lang, store],
  );

  const submitManual = React.useCallback(
    async (text: string) => {
      const target = (trimmed || pendingUrl || "").trim();
      const videoId = parseVideoId(target);
      if (!videoId) {
        toast.error("Need a valid YouTube URL above first.");
        return;
      }
      setManualBusy(true);
      setErrorMsg(null);
      store.reset();
      store.setGenerating(true);
      store.setProgress(15);
      store.setStatus("Parsing pasted transcript...");
      try {
        const tr = await fetchManualTranscript(target, text);
        setManualOpen(false);
        await generateFromTranscript(tr);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        toast.error("Couldn't use that transcript", { description: message });
        store.setGenerating(false);
      } finally {
        setManualBusy(false);
      }
    },
    [trimmed, pendingUrl, store, generateFromTranscript],
  );

  React.useEffect(() => {
    if (!pendingUrl) return;
    setUrl(pendingUrl);
    clearPendingUrl();
    runSubmit(pendingUrl);
    // pendingUrlToken changes every request, so this fires even if URL repeats
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUrlToken]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        runSubmit(trimmed);
      }}
      className={cn("w-full", compact ? "" : "space-y-3")}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Play className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Paste a YouTube URL (e.g. https://youtu.be/dQw4w9WgXcQ)"
            className={cn(
              "h-14 rounded-2xl pl-10 pr-10 text-base shadow-lg",
              compact && "h-11 text-sm",
            )}
            spellCheck={false}
            autoComplete="off"
            disabled={busy}
          />
          {detectedId && (
            <CheckCircle2
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-emerald-500"
              aria-label="Valid YouTube URL"
            />
          )}
        </div>
        <Button
          type="submit"
          size={compact ? "default" : "xl"}
          variant="brand"
          disabled={busy || !hasInput}
          className={cn("rounded-2xl", compact && "rounded-xl")}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Working...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate notes
            </>
          )}
        </Button>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Captions:</span>
            <Select value={lang} onValueChange={setLang} disabled={busy}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANG_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span>Notes language:</span>
            <Select value={outputLanguage} onValueChange={setOutputLanguage} disabled={busy}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{status}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1 space-y-2">
              <p>{errorMsg}</p>
              {detectedId && (
                <button
                  type="button"
                  onClick={() => setManualOpen(true)}
                  className="text-xs font-medium text-brand underline-offset-4 hover:underline"
                >
                  Paste transcript manually instead →
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ManualTranscriptDialog
        open={manualOpen}
        onOpenChange={(o) => {
          if (!manualBusy) setManualOpen(o);
        }}
        videoUrl={detectedId ? canonicalUrl(detectedId) : ""}
        busy={manualBusy}
        onSubmit={submitManual}
      />
    </form>
  );
}
