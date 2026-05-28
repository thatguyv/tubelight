"use client";

import * as React from "react";
import { ClipboardPaste, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  busy?: boolean;
  onSubmit: (text: string) => void | Promise<void>;
}

export function ManualTranscriptDialog({
  open,
  onOpenChange,
  videoUrl,
  busy,
  onSubmit,
}: Props) {
  const [text, setText] = React.useState("");
  const minChars = 50;
  const valid = text.trim().length >= minChars;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="size-4 text-brand" /> Paste transcript manually
          </DialogTitle>
          <DialogDescription>
            YouTube blocks transcript scraping from cloud servers. Grab the transcript yourself in
            a few clicks and we&apos;ll generate notes from it.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2 rounded-xl border bg-muted/40 p-4 text-sm">
          <li className="flex gap-2">
            <span className="font-mono text-xs text-muted-foreground">1.</span>
            <span>
              Open the video on YouTube
              {videoUrl && (
                <>
                  {" "}
                  (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand underline-offset-4 hover:underline"
                  >
                    open <ExternalLink className="size-3" />
                  </a>
                  )
                </>
              )}
              .
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-xs text-muted-foreground">2.</span>
            <span>
              Click the <b>···</b> menu under the video → <b>Show transcript</b>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-xs text-muted-foreground">3.</span>
            <span>Select all the transcript text (Cmd/Ctrl+A) and copy it.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-xs text-muted-foreground">4.</span>
            <span>Paste it below and click Generate.</span>
          </li>
        </ol>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`0:00 Welcome to the video\n0:05 Today we'll be talking about...\n0:12 ...`}
          className={cn(
            "min-h-[180px] max-h-[40vh] w-full resize-y rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          )}
          spellCheck={false}
          disabled={busy}
        />

        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "text-xs",
              valid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            {text.trim().length} characters
            {!valid && ` · need at least ${minChars}`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="brand"
              disabled={!valid || busy}
              onClick={() => onSubmit(text)}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Generating...
                </>
              ) : (
                "Generate notes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
