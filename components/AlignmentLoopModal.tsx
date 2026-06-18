"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, RotateCw } from "lucide-react";
import { Button, Textarea } from "./ui";
import { useRunStore } from "@/lib/store";

const SUGGESTED = "I want production-ready code for the payments API, not an explanation.";

export function AlignmentLoopModal() {
  const status = useRunStore((s) => s.status);
  const question = useRunStore((s) => s.pendingQuestion);
  const iteration = useRunStore((s) => s.iteration);
  const submitAnswer = useRunStore((s) => s.submitAnswer);
  const [answer, setAnswer] = useState("");

  const open = status === "awaiting-answer" && !!question;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Alignment clarification"
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl border border-warn/40 bg-panel shadow-2xl"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-warn/15 text-warn">
                  <HelpCircle className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-fg">Misalignment detected</h2>
                  <p className="text-[11px] text-muted">
                    Agent 05 → 06 · human-in-the-loop required
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 rounded border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[11px] text-warn">
                <RotateCw className="h-3 w-3" /> next: iteration {iteration + 1}
              </span>
            </div>

            <div className="px-5 py-4">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
                Question Generator asks
              </p>
              <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2.5 text-sm text-fg">
                {question?.question}
              </p>

              <p className="mt-4 mb-1 text-[11px] font-medium uppercase tracking-wide text-faint">
                Your answer
              </p>
              <Textarea
                autoFocus
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={SUGGESTED}
              />
              <button
                className="mt-1.5 text-[11px] text-faint hover:text-brand"
                onClick={() => setAnswer(SUGGESTED)}
              >
                use suggested answer
              </button>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                onClick={() => {
                  const a = answer.trim() || SUGGESTED;
                  setAnswer("");
                  submitAnswer(a);
                }}
              >
                <RotateCw className="h-4 w-4" /> Submit & re-run loop
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
