"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { useRunStore } from "@/lib/store";
import { AGENTS_BY_ID, isVisibleAgent } from "@/lib/agents";
import { formatTime, cn } from "@/lib/utils";

export function EventLog() {
  const allLog = useRunStore((s) => s.log);
  // Only show events from visible (HTTP-exposed) agents.
  const log = allLog.filter((l) => isVisibleAgent(l.agentId));
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-faint" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Live event log
        </span>
        <span className="ml-auto font-mono text-[10px] text-faint">{log.length} events</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs">
        {log.length === 0 ? (
          <p className="px-1 py-2 text-faint">Awaiting run… submit a turn to start streaming.</p>
        ) : (
          <ul className="space-y-0.5">
            {log.map((line) => {
              const meta = AGENTS_BY_ID[line.agentId];
              return (
                <li key={line.id} className="flex items-start gap-2 py-0.5">
                  <span className="shrink-0 text-faint">{formatTime(line.timestamp)}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1",
                      line.state === "running"
                        ? "bg-brand/15 text-brand"
                        : line.state === "done"
                          ? "bg-panel-2 text-muted"
                          : "text-faint",
                    )}
                  >
                    {meta?.number ?? "··"}
                  </span>
                  <span className="text-fg/80">
                    {line.message}
                    {line.iteration && line.iteration > 1 ? (
                      <span className="ml-1.5 text-warn">[iter {line.iteration}]</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
            <div ref={endRef} />
          </ul>
        )}
      </div>
    </div>
  );
}
