"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/lib/types";

export function FlashcardsTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.flashcards);

  const [order, setOrder] = React.useState<number[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const [flipped, setFlipped] = React.useState(false);

  const cards = payload?.flashcards ?? [];

  React.useEffect(() => {
    if (cards.length > 0 && !order) {
      setOrder(cards.map((_, i) => i));
    }
  }, [cards, order]);

  if (cards.length === 0) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No flashcards yet."
      />
    );
  }

  const realOrder = order ?? cards.map((_, i) => i);
  const current = cards[realOrder[idx]] as Flashcard | undefined;
  if (!current) return null;

  function next() {
    setFlipped(false);
    setIdx((i) => (i + 1) % realOrder.length);
  }
  function prev() {
    setFlipped(false);
    setIdx((i) => (i - 1 + realOrder.length) % realOrder.length);
  }
  function shuffle() {
    const arr = [...realOrder];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setOrder(arr);
    setIdx(0);
    setFlipped(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Card <span className="font-medium text-foreground">{idx + 1}</span> of{" "}
          {realOrder.length}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={shuffle}>
            <Shuffle /> Shuffle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOrder(cards.map((_, i) => i));
              setIdx(0);
              setFlipped(false);
            }}
          >
            <RotateCcw /> Reset
          </Button>
        </div>
      </div>

      <div className="relative" style={{ perspective: "1200px" }}>
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="block w-full text-left"
          aria-label="Flip card"
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, type: "spring", bounce: 0.2 }}
            className="relative grid min-h-[260px] w-full place-items-center rounded-2xl border bg-card p-8 shadow-md"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8"
              style={{ backfaceVisibility: "hidden" }}
            >
              <Badge variant="outline" className="uppercase tracking-wider">
                Question
              </Badge>
              <p className="text-balance text-center text-xl font-medium leading-snug">
                {current.q}
              </p>
              <p className="text-xs text-muted-foreground">Tap to reveal answer</p>
            </div>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <Badge variant="brand" className="uppercase tracking-wider">
                Answer
              </Badge>
              <p className="text-balance text-center text-lg leading-snug">{current.a}</p>
              {current.difficulty && (
                <Badge
                  variant={
                    current.difficulty === "hard"
                      ? "destructive"
                      : current.difficulty === "medium"
                        ? "warning"
                        : "success"
                  }
                >
                  {current.difficulty}
                </Badge>
              )}
            </div>
          </motion.div>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={prev}>
          <ChevronLeft /> Prev
        </Button>
        <div className="flex flex-1 items-center justify-center gap-1">
          {realOrder.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === idx ? "w-6 bg-brand" : "w-1.5 bg-muted",
              )}
            />
          ))}
        </div>
        <Button variant="brand" onClick={next}>
          Next <ChevronRight />
        </Button>
      </div>

      <AnimatePresence>
        {status.loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs text-muted-foreground"
          >
            Generating more cards...
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
