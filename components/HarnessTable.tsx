"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { HarnessEntry } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { Mono } from "./ui";
import { formatDate, cn } from "@/lib/utils";
import { severityStyle } from "@/lib/verdict";

function SevTag({ entry }: { entry: HarnessEntry }) {
  const sev =
    entry.antipatterns_verdict.severity ?? entry.constraints_verdict.severity ?? null;
  const s = severityStyle(sev);
  if (!s) return <span className="text-faint">—</span>;
  return (
    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", s.className)}>
      {s.label}
    </span>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</div>
      {children}
    </div>
  );
}

function Row({ entry }: { entry: HarnessEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        className="cursor-pointer border-t border-border hover:bg-panel-2/50"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {open ? (
              <ChevronDown className="h-3.5 w-3.5 text-faint" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-faint" />
            )}
            <span className="font-mono text-[11px] text-muted">{entry.entry_id}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-[11px] text-muted">{formatDate(entry.timestamp)}</td>
        <td className="max-w-[260px] truncate px-3 py-2.5 text-sm text-fg/90">
          {entry.human_input}
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge verdict={entry.alignment} />
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge verdict={entry.gap} />
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge verdict={entry.constraints_verdict} />
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge verdict={entry.antipatterns_verdict} />
        </td>
        <td className="px-3 py-2.5">
          <SevTag entry={entry} />
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-bg/40">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Detail label="Human input">
                <Mono>{entry.human_input}</Mono>
              </Detail>
              <Detail label="Engine thinking">
                <Mono>{entry.engine_thinking}</Mono>
              </Detail>
              <Detail label="Human profile">
                <Mono>{JSON.stringify(entry.human_profile, null, 2)}</Mono>
              </Detail>
              <Detail label="Engine profile">
                <Mono>{JSON.stringify(entry.engine_profile, null, 2)}</Mono>
              </Detail>
              <Detail label="Alignment">
                <Mono>{JSON.stringify(entry.alignment, null, 2)}</Mono>
              </Detail>
              <Detail label="Gap">
                <Mono>{JSON.stringify(entry.gap, null, 2)}</Mono>
              </Detail>
              <Detail label="Constraints verdict">
                <Mono>{JSON.stringify(entry.constraints_verdict, null, 2)}</Mono>
              </Detail>
              <Detail label="Anti-patterns verdict">
                <Mono>{JSON.stringify(entry.antipatterns_verdict, null, 2)}</Mono>
              </Detail>
              <div className="md:col-span-2">
                <Detail label="Final output">
                  <Mono className="border-pass/30">{entry.final_output}</Mono>
                </Detail>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function HarnessTable({ entries }: { entries: HarnessEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
        <p className="text-sm font-medium text-muted">No matching entries</p>
        <p className="text-xs text-faint">Adjust your filters or search query.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-faint">
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Human input</th>
            <th className="px-3 py-2 font-medium">Alignment</th>
            <th className="px-3 py-2 font-medium">Gap</th>
            <th className="px-3 py-2 font-medium">Constraints</th>
            <th className="px-3 py-2 font-medium">Anti-patterns</th>
            <th className="px-3 py-2 font-medium">Severity</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <Row key={e.entry_id} entry={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
