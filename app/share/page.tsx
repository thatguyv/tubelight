"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { NotesView } from "@/components/notes-view";
import { Button } from "@/components/ui/button";
import { decodePayload } from "@/lib/share";
import type { NotesPayload } from "@/lib/types";

export default function SharePage() {
  const [state, setState] = React.useState<
    { kind: "loading" } | { kind: "ok"; payload: NotesPayload } | { kind: "error" }
  >({ kind: "loading" });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const encoded = params.get("data");
    if (!encoded) {
      setState({ kind: "error" });
      return;
    }
    const payload = decodePayload(encoded);
    if (!payload) {
      setState({ kind: "error" });
      return;
    }
    setState({ kind: "ok", payload });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {state.kind === "loading" && (
          <div className="grid flex-1 place-items-center py-24">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {state.kind === "error" && (
          <div className="mx-auto max-w-xl px-4 py-24 text-center">
            <h2 className="text-xl font-semibold">Couldn&apos;t decode this share link</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The link is malformed or truncated.
            </p>
            <Button asChild variant="brand" className="mt-6">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        )}
        {state.kind === "ok" && (
          <NotesView
            videoId={state.payload.meta.videoId}
            hydrate={state.payload}
            readOnly
          />
        )}
      </main>
    </div>
  );
}
