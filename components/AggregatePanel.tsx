"use client";

import { Card, CardHeader, CardTitle } from "./ui";
import type { HarnessEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Bar {
  label: string;
  value: number;
  tone?: "fail" | "warn" | "brand";
}

function BarChart({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const toneCls: Record<string, string> = {
    fail: "bg-fail/70",
    warn: "bg-warn/70",
    brand: "bg-brand/70",
  };
  return (
    <div className="flex flex-col gap-2">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-right text-[11px] text-muted">{b.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded bg-panel-2">
            <div
              className={cn("h-full rounded", toneCls[b.tone ?? "brand"])}
              style={{ width: `${(b.value / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-right font-mono text-[11px] text-fg">{b.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AggregatePanel({ entries }: { entries: HarnessEntry[] }) {
  // Violations per agent
  const perAgent: Record<string, number> = {};
  const ruleCounts: Record<string, number> = {};
  let loops = 0;

  for (const e of entries) {
    const checkers = [e.constraints_verdict, e.antipatterns_verdict];
    for (const c of checkers) {
      if (c.status === "violation") {
        perAgent[c.agent] = (perAgent[c.agent] ?? 0) + 1;
        if (c.rule) ruleCounts[c.rule] = (ruleCounts[c.rule] ?? 0) + 1;
      }
    }
    if (e.gap.status === "gap-found") perAgent["gap-analyzer"] = (perAgent["gap-analyzer"] ?? 0) + 1;
    if (e.alignment.status === "misaligned") {
      perAgent["alignment-checker"] = (perAgent["alignment-checker"] ?? 0) + 1;
      loops++;
    }
  }

  const agentBars: Bar[] = Object.entries(perAgent)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, tone: "fail" as const }));

  const ruleBars: Bar[] = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: label.split(" — ")[0], value, tone: "warn" as const }));

  const loopRate = entries.length ? Math.round((loops / entries.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Violations per agent</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4">
          {agentBars.length ? <BarChart bars={agentBars} /> : <Empty />}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most-triggered rules</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4">
          {ruleBars.length ? <BarChart bars={ruleBars} /> : <Empty />}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alignment loop frequency</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-6">
          <div className="font-mono text-4xl font-bold text-warn">{loopRate}%</div>
          <p className="text-center text-[11px] text-muted">
            {loops} of {entries.length} turns required a misalignment loop
          </p>
        </div>
      </Card>
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-center text-xs text-faint">No data</p>;
}
