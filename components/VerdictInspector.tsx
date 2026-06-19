"use client";

import { FileSearch } from "lucide-react";
import { AGENTS_BY_ID } from "@/lib/agents";
import { useRunStore } from "@/lib/store";
import type { Profile, Verdict } from "@/lib/types";
import { Mono } from "./ui";
import { StatusBadge, StateBadge } from "./StatusBadge";
import { AGENT_ICON } from "./agentIcons";
import { severityStyle, verdictSeverity } from "@/lib/verdict";
import { cn } from "@/lib/utils";

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</span>
      <span className={cn("text-sm text-fg/90 break-words", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}

// Renders the structured fields, respecting each verdict's shape.
function VerdictFields({ v }: { v: Verdict }) {
  const agent = (v as { agent: string }).agent;

  if (agent === "human-logger") {
    const l = v as Extract<Verdict, { agent: "human-logger" }>;
    return (
      <>
        <Field label="timestamp" value={l.timestamp} mono />
        <div className="pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">input</span>
          <Mono className="mt-1">{l.input}</Mono>
        </div>
      </>
    );
  }
  if (agent === "thinking-logger") {
    const l = v as Extract<Verdict, { agent: "thinking-logger" }>;
    return (
      <>
        <Field label="timestamp" value={l.timestamp} mono />
        <div className="pt-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">thinking</span>
          <Mono className="mt-1">{l.thinking}</Mono>
        </div>
      </>
    );
  }
  if (agent === "human-profiler" || agent === "engine-profiler") {
    const p = v as Profile;
    return (
      <>
        <Field label="id" value={p.id} mono />
        <Field label="role" value={p.role} />
        <Field label="scope" value={p.scope} />
      </>
    );
  }
  if (agent === "alignment-checker" || agent === "identity") {
    const a = v as Extract<Verdict, { agent: "alignment-checker" }>;
    return <Field label="reason" value={a.reason ?? "—"} />;
  }
  if (agent === "question-generator") {
    const q = v as Extract<Verdict, { agent: "question-generator" }>;
    return (
      <div className="pt-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">question</span>
        <Mono className="mt-1 border-warn/40 text-warn">{q.question}</Mono>
      </div>
    );
  }
  if (agent === "gap-analyzer") {
    const g = v as Extract<Verdict, { agent: "gap-analyzer" }>;
    return <Field label="gap" value={g.gap ?? "—"} />;
  }
  // CheckerVerdict (constraints, antipatterns, voice, quality)
  const c = v as Extract<Verdict, { agent: string; rule: string | null }>;
  const sev = verdictSeverity(v);
  const sevStyle = severityStyle(sev);
  return (
    <>
      <div className="grid grid-cols-[100px_1fr] gap-2 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">severity</span>
        {sevStyle ? (
          <span className={cn("inline-flex w-fit rounded border px-1.5 py-0.5 text-[10px] font-bold", sevStyle.className)}>
            {sevStyle.label}
          </span>
        ) : (
          <span className="text-sm text-fg/60">none</span>
        )}
      </div>
      <Field label="rule" value={c.rule ?? "—"} mono />
      <div className="pt-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">excerpt</span>
        <Mono className="mt-1">{c.excerpt ?? "—"}</Mono>
      </div>
    </>
  );
}

export function VerdictInspector() {
  const selected = useRunStore((s) => s.selectedAgent);
  const nodes = useRunStore((s) => s.nodes);

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <FileSearch className="h-8 w-8 text-faint" />
        <p className="text-sm font-medium text-muted">No agent selected</p>
        <p className="text-xs text-faint">
          Click any node in the pipeline to inspect its verdict.
        </p>
      </div>
    );
  }

  const meta = AGENTS_BY_ID[selected];
  const node = nodes[selected];
  const Icon = AGENT_ICON[selected];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand/25 to-brand-2/20 text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-fg">{meta.name}</h2>
              <span className="font-mono text-[10px] text-faint">agent {meta.number}</span>
            </div>
          </div>
          {node.state === "done" && node.verdict ? (
            <StatusBadge verdict={node.verdict} />
          ) : (
            <StateBadge state={node.state} />
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">{meta.job}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {meta.exposure === "http" ? (
            <span className="rounded border border-brand/40 bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand">
              POST /api/agent/{meta.endpoint}
            </span>
          ) : (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
              coordinator-orchestrated
            </span>
          )}
          {meta.model && (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {meta.model}
            </span>
          )}
          {meta.runtime && (
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-muted">
              {meta.runtime}
            </span>
          )}
        </div>
        <div className="mt-1.5 font-mono text-[10px] text-faint">
          iteration {node.iteration} · shape: {meta.verdictShape}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {node.state === "idle" && (
          <p className="text-sm text-faint">Agent has not run yet.</p>
        )}
        {node.state === "running" && (
          <p className="text-sm text-brand">Running…</p>
        )}
        {node.state === "done" && node.verdict && (
          <>
            <div className="divide-y divide-border/60">
              <VerdictFields v={node.verdict} />
            </div>
            <div className="mt-4">
              <span className="text-[11px] font-medium uppercase tracking-wide text-faint">raw verdict</span>
              <Mono className="mt-1">{JSON.stringify(node.verdict, null, 2)}</Mono>
            </div>
          </>
        )}
        {node.state === "done" && !node.verdict && (
          <p className="text-sm text-muted">
            This agent orchestrates the run and emits no verdict of its own.
          </p>
        )}
      </div>
    </div>
  );
}
