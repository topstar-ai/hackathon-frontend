"use client";

import { motion } from "framer-motion";
import { Loader2, Wand2, CheckCircle2, PackageCheck, Network } from "lucide-react";
import { Card, CardHeader, CardTitle, Mono } from "./ui";
import { useRunStore } from "@/lib/store";
import { cn } from "@/lib/utils";

// Minimal line-level diff: lines only in `before` are removals, only in `after`
// are additions, shared lines are unchanged.
function LineDiff({ before, after }: { before: string; after: string }) {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg font-mono text-xs">
      {beforeLines.map((l, i) => {
        const removed = !afterSet.has(l);
        return (
          <div
            key={`b-${i}`}
            className={cn(
              "px-3 py-0.5 whitespace-pre-wrap",
              removed ? "bg-fail/10 text-fail" : "text-fg/40",
            )}
          >
            <span className="select-none pr-2 text-faint">{removed ? "-" : " "}</span>
            {l || " "}
          </div>
        );
      })}
      {afterLines
        .filter((l) => !beforeSet.has(l))
        .map((l, i) => (
          <div
            key={`a-${i}`}
            className="whitespace-pre-wrap bg-pass/10 px-3 py-0.5 text-pass"
          >
            <span className="select-none pr-2 text-faint">+</span>
            {l || " "}
          </div>
        ))}
    </div>
  );
}

export function OutputPanel() {
  const status = useRunStore((s) => s.status);
  const correction = useRunStore((s) => s.correction);
  const finalOutput = useRunStore((s) => s.finalOutput);

  const correcting = correction?.status === "correcting";
  const corrected = correction?.status === "corrected";

  if (status === "idle") return null;

  return (
    <Card id="final-result" className="scroll-mt-20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-brand/30 to-brand-2/25 text-brand">
            <Network className="h-3.5 w-3.5" />
          </span>
          <div>
            <CardTitle>Final result</CardTitle>
            <p className="text-[10px] text-faint">exported by the coordinator</p>
          </div>
        </div>
        {status === "done" && (
          <span className="flex items-center gap-1 text-[11px] text-pass">
            <PackageCheck className="h-3.5 w-3.5" /> delivered
          </span>
        )}
      </CardHeader>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {correcting && (
          <motion.div
            className="flex items-center gap-2 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-sm text-warn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Coordinator correcting output…
          </motion.div>
        )}

        {corrected && correction?.original && correction?.corrected && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-warn">
              <Wand2 className="h-3.5 w-3.5" />
              correction diff
            </div>
            <LineDiff before={correction.original} after={correction.corrected} />
          </div>
        )}

        {finalOutput && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-pass">
              <CheckCircle2 className="h-3.5 w-3.5" />
              final output
            </div>
            <Mono className="border-pass/30">{finalOutput}</Mono>
          </div>
        )}

        {status === "running" && !correcting && !finalOutput && (
          <p className="text-sm text-muted">Pipeline running — output pending.</p>
        )}
      </div>
    </Card>
  );
}
