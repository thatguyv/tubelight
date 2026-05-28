"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trophy, RotateCcw, Lock } from "lucide-react";
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
  const allAnswered = answeredCount === quiz.length;
  const score = submitted
    ? quiz.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0)
    : 0;

  function reset() {
    setAnswers({});
    setSubmitted(false);
    // scroll to top for clean retake
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      {/* Header: progress + submit/retake */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-xl border bg-background/95 px-3 py-2.5 backdrop-blur">
        <div className="flex flex-1 items-center gap-3">
          <Progress
            value={(answeredCount / quiz.length) * 100}
            className="max-w-[180px]"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">{answeredCount}</span>
            {" / "}
            {quiz.length} answered
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
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
            title={allAnswered ? "Submit your answers" : "Answer all questions to submit"}
          >
            {allAnswered ? "Submit" : (
              <>
                <Lock /> Submit
              </>
            )}
          </Button>
        )}
      </div>

      {/* Score card */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3 }}
          >
            <Card className="flex items-center gap-4 border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-5">
              <div className="grid size-14 place-items-center rounded-2xl bg-brand/15 text-brand">
                <Trophy className="size-7" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold leading-none">
                  {score} <span className="text-base font-normal text-muted-foreground">/ {quiz.length}</span>
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {score === quiz.length
                    ? "Perfect score — you nailed it."
                    : score >= quiz.length * 0.7
                      ? "Strong understanding. Review the missed items below."
                      : "Good start. Read the explanations and try again."}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions */}
      <div className="space-y-3">
        {quiz.map((q, i) => {
          const selected = answers[i];
          const correct = q.correctIndex;
          const hasAnswer = selected !== undefined;
          return (
            <Card
              key={i}
              className={cn(
                "p-4 transition",
                submitted && hasAnswer && selected === correct && "border-emerald-500/40",
                submitted && hasAnswer && selected !== correct && "border-destructive/40",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-medium leading-snug">
                  <span className="text-muted-foreground">Q{i + 1}.</span> {q.question}
                </p>
                {submitted && hasAnswer && (
                  <Badge variant={selected === correct ? "success" : "destructive"}>
                    {selected === correct ? "Correct" : "Wrong"}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {q.options.map((opt, j) => {
                  const isPicked = selected === j;
                  const isCorrect = j === correct;
                  const showResult = submitted;
                  return (
                    <button
                      key={j}
                      type="button"
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: j }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition",
                        !showResult && "hover:border-brand/40 hover:bg-accent cursor-pointer",
                        isPicked && !showResult && "border-brand bg-brand/5",
                        showResult && isCorrect && "border-emerald-500/60 bg-emerald-500/10",
                        showResult &&
                          isPicked &&
                          !isCorrect &&
                          "border-destructive/60 bg-destructive/10",
                        showResult && !isCorrect && !isPicked && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                          !showResult && !isPicked && "border-muted-foreground/30 text-muted-foreground",
                          isPicked && !showResult && "border-brand bg-brand text-brand-foreground",
                          showResult && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                          showResult &&
                            isPicked &&
                            !isCorrect &&
                            "border-destructive bg-destructive text-destructive-foreground",
                          showResult && !isCorrect && !isPicked && "border-muted-foreground/30 text-muted-foreground",
                        )}
                      >
                        {showResult && isCorrect ? (
                          <Check className="size-3.5" />
                        ) : showResult && isPicked && !isCorrect ? (
                          <X className="size-3.5" />
                        ) : (
                          String.fromCharCode(65 + j)
                        )}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation only appears after submit */}
              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 rounded-lg border-l-2 border-brand bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {q.explanation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Bottom CTA when scrolled past questions */}
      {!submitted && (
        <div className="flex justify-end pt-2">
          <Button
            variant="brand"
            size="lg"
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
          >
            {allAnswered ? (
              `Submit ${quiz.length} answers`
            ) : (
              <>
                <Lock /> Answer all to submit ({answeredCount}/{quiz.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
