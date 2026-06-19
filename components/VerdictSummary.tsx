"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldQuestion, Loader2 } from "lucide-react";
import { useRunStore } from "@/lib/store";
import { verdictTone } from "@/lib/verdict";
import { isVisibleAgent } from "@/lib/agents";
import type { AgentId } from "@/lib/types";
import { cn } from "@/lib/utils";

// Headline verdict banner — mirrors the reference "Drift confirmed" callout.
export function VerdictSummary() {
  const status = useRunStore((s) => s.status);
  const nodes = useRunStore((s) => s.nodes);
  const iteration = useRunStore((s) => s.iteration);

  let fails = 0;
  (Object.entries(nodes) as [AgentId, (typeof nodes)[AgentId]][]).forEach(([id, n]) => {
    if (!isVisibleAgent(id)) return;
    if (n.state === "done" && n.verdict && verdictTone(n.verdict) === "fail") fails++;
  });

  let tone: "neutral" | "running" | "warn" | "pass" | "fail" = "neutral";
  let title = "Idle";
  let sub = "Submit a turn to run the alignment pipeline.";
  let Icon = ShieldQuestion;

  if (status === "running") {
    tone = "running";
    title = "Analyzing turn…";
    sub = "Agents are inspecting the conversation in real time.";
    Icon = Loader2;
  } else if (status === "awaiting-answer") {
    tone = "warn";
    title = "Drift detected";
    sub = `Misalignment found — human input required (iteration ${iteration}).`;
    Icon = ShieldAlert;
  } else if (status === "done") {
    if (fails > 0) {
      tone = "fail";
      title = "Drift confirmed";
      sub = `${fails} verdict${fails > 1 ? "s" : ""} flagged · output corrected before delivery.`;
      Icon = ShieldAlert;
    } else {
      tone = "pass";
      title = "Aligned · clean";
      sub = "All agents passed — output delivered as-is.";
      Icon = ShieldCheck;
    }
  }

  const styles: Record<string, string> = {
    neutral: "border-white/10 text-muted",
    running: "border-brand/40 text-brand glow-brand",
    warn: "border-warn/45 text-warn",
    pass: "border-pass/45 text-pass",
    fail: "border-fail/55 text-fail glow-fail",
  };

  return (
    <motion.div
      layout
      className={cn(
        "glass-2 flex items-center gap-3 rounded-xl border px-3.5 py-2.5",
        styles[tone],
      )}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5">
        <Icon className={cn("h-5 w-5", tone === "running" && "animate-spin")} />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-bold tracking-tight">{title}</div>
        <div className="truncate text-[11px] text-muted">{sub}</div>
      </div>
    </motion.div>
  );
}
