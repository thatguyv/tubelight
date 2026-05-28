"use client";

import * as React from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildShareUrl } from "@/lib/share";
import type { NotesPayload } from "@/lib/types";

interface Props {
  payload: NotesPayload | null;
}

export function ShareButton({ payload }: Props) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const url = React.useMemo(() => {
    if (!payload || typeof window === "undefined") return "";
    return buildShareUrl(window.location.origin, payload);
  }, [payload]);

  const sizeKb = Math.round((url.length / 1024) * 10) / 10;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select the URL manually.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={!payload}>
          <Share2 /> Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share these notes</DialogTitle>
          <DialogDescription>
            The full notes are compressed into the URL fragment, so no server stores your data.
            {sizeKb > 0 && ` Link size: ${sizeKb} KB.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button variant="brand" onClick={copy} aria-label="Copy">
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        {sizeKb > 32 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Heads-up: link is large ({sizeKb} KB) and may exceed limits in some messaging apps.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
