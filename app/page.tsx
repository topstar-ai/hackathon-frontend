"use client";

import { Card } from "@/components/ui";
import { InputPanel } from "@/components/InputPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { PipelineGraph } from "@/components/PipelineGraph";
import { VerdictInspector } from "@/components/VerdictInspector";
import { EventLog } from "@/components/EventLog";
import { AlignmentLoopModal } from "@/components/AlignmentLoopModal";
import { CoordinatorBar } from "@/components/CoordinatorBar";
import { useRunStore } from "@/lib/store";
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
          The coordinator routes every turn through the agent workflow and only exports the
          result once it passes alignment, gap, and the parallel quality checks.
        </p>
      </div>

      {/* Coordinator = the controller over the whole run */}
      <div className="mb-4">
        <CoordinatorBar />
      </div>

      <RunError />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)_380px]">
        {/* Left: input + final result */}
        <div className="flex flex-col gap-4">
          <InputPanel />
          <OutputPanel />
        </div>

        {/* Center: the agent workflow */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-sm font-semibold text-fg">Agent workflow</h2>
                <p className="text-[11px] text-faint">8 agents · generation steps</p>
              </div>
              <StatusPill />
            </div>
          </div>
          <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-4">
            <PipelineGraph />
          </div>
        </Card>

        {/* Right: inspector */}
        <Card className="lg:max-h-[calc(100vh-6rem)] lg:sticky lg:top-[4.5rem] overflow-hidden">
          <VerdictInspector />
        </Card>
      </div>

      {/* Bottom: event log */}
      <Card className="mt-4 h-52 overflow-hidden">
        <EventLog />
      </Card>
    </div>
  );
}
