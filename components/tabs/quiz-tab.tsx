"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trophy, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SectionStatus } from "@/components/section-status";
import { useNotesStore } from "@/store/notes";
import { cn } from "@/lib/utils";

export function QuizTab() {
  const payload = useNotesStore((s) => s.payload);
  const status = useNotesStore((s) => s.sectionStatus.quiz);
  const quiz = payload?.quiz ?? [];

  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [revealed, setRevealed] = React.useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = React.useState(false);

  if (quiz.length === 0) {
    return (
      <SectionStatus
        loading={status.loading}
        error={status.error}
        empty={!status.loading && !status.error}
        emptyMessage="No quiz yet."
      />
    );
  }

  const answeredCount = Object.keys(answers).length;
  const score = submitted
    ? quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    : 0;

  function reset() {
    setAnswers({});
    setRevealed({});
    setSubmitted(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Progress value={(answeredCount / quiz.length) * 100} className="max-w-[160px]" />
          <span className="text-xs text-muted-foreground">
            {answeredCount} / {quiz.length} answered
          </span>
        </div>
        {submitted ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw /> Retake
          </Button>
        ) : (
          <Button
            variant="brand"
            size="sm"
            disabled={answeredCount < quiz.length}
            onClick={() => setSubmitted(true)}
          >
            Submit
          </Button>
        )}
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="flex items-center gap-3 border-brand/30 bg-brand/5 p-4">
              <Trophy className="size-6 text-brand" />
              <div className="flex-1">
                <p className="font-semibold">
                  You scored {score} / {quiz.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {score === quiz.length
                    ? "Perfect — you nailed it."
                    : score >= quiz.length * 0.7
                      ? "Strong understanding. Review the missed items below."
                      : "Good start. Check explanations and try again."}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {quiz.map((q, i) => {
          const selected = answers[i];
          const correct = q.correctIndex;
          const showResult = submitted || revealed[i];
          return (
            <Card key={i} className="p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">
                  <span className="text-muted-foreground">Q{i + 1}.</span> {q.question}
                </p>
                {showResult && selected !== undefined && (
                  <Badge variant={selected === correct ? "success" : "destructive"}>
                    {selected === correct ? "Correct" : "Wrong"}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isPicked = selected === j;
                  const isCorrect = j === correct;
                  return (
                    <button
                      key={j}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition",
                        !showResult && "hover:border-brand/40 hover:bg-accent",
                        isPicked && !showResult && "border-brand bg-brand/5",
                        showResult && isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                        showResult && isPicked && !isCorrect && "border-destructive/60 bg-destructive/10",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border text-xs",
                          isPicked && !showResult && "border-brand bg-brand text-brand-foreground",
                          showResult && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                          showResult && isPicked && !isCorrect && "border-destructive bg-destructive text-destructive-foreground",
                        )}
                      >
                        {showResult && isCorrect ? (
                          <Check className="size-3" />
                        ) : showResult && isPicked && !isCorrect ? (
                          <X className="size-3" />
                        ) : (
                          String.fromCharCode(65 + j)
                        )}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {!submitted && !revealed[i] && selected !== undefined && (
                <button
                  type="button"
                  onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
                  className="mt-3 text-xs text-brand underline-offset-4 hover:underline"
                >
                  Show explanation
                </button>
              )}
              {showResult && (
                <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Why:</span> {q.explanation}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
