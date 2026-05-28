"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { Send, Sparkles, User as UserIcon, StopCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotesStore } from "@/store/notes";
import { streamChat } from "@/lib/client-api";
import { cn, formatTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

const SUGGESTIONS = [
  "Summarize the main argument in one paragraph.",
  "What surprised the speaker most?",
  "Give me 3 takeaways I should remember.",
  "Are there any concrete examples mentioned?",
];

export function ChatTab() {
  const payload = useNotesStore((s) => s.payload);
  const seekTo = useNotesStore((s) => s.seekTo);
  const setChatMessages = useNotesStore((s) => s.setChatMessages);
  const clearChat = useNotesStore((s) => s.clearChat);
  const messages = React.useMemo<ChatMessage[]>(
    () => payload?.chatMessages ?? [],
    [payload?.chatMessages],
  );

  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!payload || !text.trim() || busy) return;
    const trimmed = text.trim();
    const baseMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setChatMessages([...baseMessages, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await streamChat(
        {
          meta: payload.meta,
          transcript: payload.transcript,
          messages: baseMessages,
        },
        (chunk) => {
          setChatMessages((cur) => {
            const copy = [...cur];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: last.content + chunk };
            }
            return copy;
          });
        },
        ctrl.signal,
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setChatMessages((cur) => {
          const copy = [...cur];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `_Error: ${(err as Error).message}_`,
          };
          return copy;
        });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
    setBusy(false);
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col gap-3">
      {messages.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {messages.length} message{messages.length === 1 ? "" : "s"} in this conversation
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (busy) abortRef.current?.abort();
              clearChat();
            }}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 /> Clear
          </Button>
        </div>
      )}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border bg-card p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grid size-12 place-items-center rounded-2xl brand-gradient text-white shadow-lg">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-medium">Ask anything about this video</p>
              <p className="text-sm text-muted-foreground">
                Answers are grounded in the transcript.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs transition hover:border-brand/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatBubble key={i} message={m} onTimestamp={seekTo} />
          ))
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the video..."
          className="h-11"
          disabled={busy}
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={stop} aria-label="Stop">
            <StopCircle /> Stop
          </Button>
        ) : (
          <Button type="submit" variant="brand" disabled={!input.trim()}>
            <Send /> Send
          </Button>
        )}
      </form>
    </div>
  );
}

function ChatBubble({
  message,
  onTimestamp,
}: {
  message: ChatMessage;
  onTimestamp: (sec: number) => void;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          isUser
            ? "bg-brand text-brand-foreground"
            : "border bg-card text-foreground",
        )}
      >
        {isUser ? <UserIcon className="size-4" /> : <Sparkles className="size-4 text-brand" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-brand text-brand-foreground" : "bg-muted/50",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : message.content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p>{withTimestampLinks(children, onTimestamp)}</p>,
                li: ({ children }) => <li>{withTimestampLinks(children, onTimestamp)}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
          </span>
        )}
      </div>
    </motion.div>
  );
}

const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

function withTimestampLinks(
  children: React.ReactNode,
  onTimestamp: (sec: number) => void,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const parts: React.ReactNode[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    TIMESTAMP_RE.lastIndex = 0;
    while ((m = TIMESTAMP_RE.exec(child))) {
      const [full, a, b, c] = m;
      const seconds = c
        ? Number(a) * 3600 + Number(b) * 60 + Number(c)
        : Number(a) * 60 + Number(b);
      if (m.index > last) parts.push(child.slice(last, m.index));
      parts.push(
        <button
          key={`t-${m.index}`}
          type="button"
          onClick={() => onTimestamp(seconds)}
          className="rounded bg-brand/15 px-1 font-mono text-xs text-brand hover:bg-brand hover:text-brand-foreground"
        >
          {formatTime(seconds)}
        </button>,
      );
      last = m.index + full.length;
    }
    if (last < child.length) parts.push(child.slice(last));
    return parts.length > 0 ? parts : child;
  });
}
