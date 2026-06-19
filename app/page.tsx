"use client";

import { Card } from "@/components/ui";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { PipelineGraph } from "@/components/PipelineGraph";
import { VerdictInspector } from "@/components/VerdictInspector";
import { EventLog } from "@/components/EventLog";
import { AlignmentLoopModal } from "@/components/AlignmentLoopModal";
import { VerdictSummary } from "@/components/VerdictSummary";
import { useRunStore } from "@/lib/store";
import { verdictTone } from "@/lib/verdict";
import { isVisibleAgent } from "@/lib/agents";
import type { AgentId } from "@/lib/types";
import { cn } from "@/lib/utils";

function StatusPill() {
  const status = useRunStore((s) => s.status);
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "Idle", cls: "border-border-strong text-muted" },
    running: { label: "Running", cls: "border-brand/50 text-brand" },
    "awaiting-answer": { label: "Awaiting human", cls: "border-warn/50 text-warn" },
    done: { label: "Complete", cls: "border-pass/50 text-pass" },
    error: { label: "Error", cls: "border-fail/50 text-fail" },
  };
  const s = map[status];
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", s.cls)}>
      {s.label}
    </span>
  );
}

function RunError() {
  const status = useRunStore((s) => s.status);
  const error = useRunStore((s) => s.error);
  if (status !== "error" || !error) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-xl border border-fail/40 bg-fail/10 px-3.5 py-2.5 text-sm text-fail">
      <span className="font-semibold">Run failed:</span>
      <span className="font-mono text-xs text-fail/90">{error}</span>
    </div>
  );
}

function VerdictTally() {
  const nodes = useRunStore((s) => s.nodes);
  let pass = 0;
  let fail = 0;
  (Object.entries(nodes) as [AgentId, (typeof nodes)[AgentId]][]).forEach(([id, n]) => {
    if (!isVisibleAgent(id)) return;
    if (n.state !== "done" || !n.verdict) return;
    const t = verdictTone(n.verdict);
    if (t === "pass") pass++;
    if (t === "fail") fail++;
  });
  return (
    <div className="flex items-center gap-3 font-mono text-[11px]">
      <span className="text-pass">{pass} pass</span>
      <span className="text-fail">{fail} flag</span>
    </div>
  );
}

export default function RunPage() {
  return (
    <div className="mx-auto max-w-[1600px] p-4">
      <AlignmentLoopModal />

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="brand-text">Drift</span>{" "}
          <span className="text-fg">alignment pipeline</span>
        </h1>
        <p className="text-sm text-muted">
          Specialist agents intercept every turn and hold the engine&apos;s output until it
          passes alignment, gap, and the parallel quality checks.
        </p>
      </div>

      <RunError />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)_380px]">
        {/* Left: input + output */}
        <div className="flex flex-col gap-4">
          <InputPanel />
          <OutputPanel />
        </div>

        {/* Center: pipeline */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-fg">Alignment pipeline</h2>
              <StatusPill />
            </div>
            <VerdictTally />
          </div>
          <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-4">
            <div className="mx-auto mb-4 w-full max-w-md">
              <VerdictSummary />
            </div>
            <PipelineGraph />
          </div>
        </Card>

        {/* Right: inspector */}
        <Card className="lg:max-h-[calc(100vh-6rem)] lg:sticky lg:top-[4.5rem] overflow-hidden">
          <VerdictInspector />
        </Card>
      </div>

      {/* Bottom: event log */}
      <Card className="mt-4 h-56 overflow-hidden">
        <EventLog />
      </Card>
    </div>
  );
}
