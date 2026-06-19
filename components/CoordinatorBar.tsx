"use client";

import { motion } from "framer-motion";
import {
  Network,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  PackageCheck,
  ArrowDownToLine,
} from "lucide-react";
import { useRunStore } from "@/lib/store";
import { verdictTone } from "@/lib/verdict";
import { isVisibleAgent } from "@/lib/agents";
import type { AgentId } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================================
// The Coordinator is the controller. It routes the turn through every agent
// and is the one that exports the final result. This top-level bar represents
// that role: the agents below it are just the generation workflow.
// ============================================================================

export function CoordinatorBar() {
  const status = useRunStore((s) => s.status);
  const nodes = useRunStore((s) => s.nodes);
  const iteration = useRunStore((s) => s.iteration);

  let pass = 0;
  let fail = 0;
  (Object.entries(nodes) as [AgentId, (typeof nodes)[AgentId]][]).forEach(([id, n]) => {
    if (!isVisibleAgent(id) || n.state !== "done" || !n.verdict) return;
    const t = verdictTone(n.verdict);
    if (t === "pass") pass++;
    if (t === "fail") fail++;
  });

  let tone: "idle" | "running" | "warn" | "pass" | "fail" = "idle";
  let title = "Coordinator idle";
  let sub = "Submit a turn — the coordinator routes it through every agent.";
  let StateIcon = Network;

  if (status === "running") {
    tone = "running";
    title = "Coordinator routing turn…";
    sub = "Passing the turn through each agent in the workflow.";
    StateIcon = Loader2;
  } else if (status === "awaiting-answer") {
    tone = "warn";
    title = "Drift detected — clarification needed";
    sub = `Alignment failed; the coordinator paused the loop (iteration ${iteration}).`;
    StateIcon = ShieldAlert;
  } else if (status === "done") {
    if (fail > 0) {
      tone = "fail";
      title = "Drift confirmed — output corrected";
      sub = "The coordinator corrected the output before exporting the final result.";
      StateIcon = ShieldAlert;
    } else {
      tone = "pass";
      title = "Aligned — final result exported";
      sub = "All agents passed. The coordinator released the output unchanged.";
      StateIcon = ShieldCheck;
    }
  }

  const ring: Record<string, string> = {
    idle: "border-white/10",
    running: "border-brand/45",
    warn: "border-warn/45",
    pass: "border-pass/45",
    fail: "border-fail/50",
  };
  const accent: Record<string, string> = {
    idle: "text-muted",
    running: "text-brand",
    warn: "text-warn",
    pass: "text-pass",
    fail: "text-fail",
  };

  return (
    <motion.div
      layout
      className={cn(
        "glass flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3",
        ring[tone],
      )}
    >
      {/* identity */}
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#b15cff] to-[#ff4d8d] text-white shadow-[0_4px_18px_-6px_rgba(177,92,255,0.8)]">
          <Network className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <div className="leading-tight">
          <div className="flex items-center gap-2 text-sm font-bold text-fg">
            Coordinator
            <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-faint">
              agent 14 · controller
            </span>
          </div>
          <div className="text-[11px] text-faint">links every agent → exports the final result</div>
        </div>
      </div>

      {/* status */}
      <div className={cn("flex min-w-0 flex-1 items-center gap-2", accent[tone])}>
        <StateIcon className={cn("h-4 w-4 shrink-0", tone === "running" && "animate-spin")} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="truncate text-[11px] text-muted">{sub}</div>
        </div>
      </div>

      {/* tally + final-result hint */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-pass">{pass} pass</span>
          <span className="text-faint">·</span>
          <span className="text-fail">{fail} flag</span>
        </div>
        {status === "done" && (
          <a
            href="#final-result"
            className="flex items-center gap-1.5 rounded-lg border border-pass/40 bg-pass/10 px-2.5 py-1.5 text-[11px] font-semibold text-pass transition-colors hover:bg-pass/20"
          >
            <PackageCheck className="h-3.5 w-3.5" />
            Final result
            <ArrowDownToLine className="h-3 w-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
