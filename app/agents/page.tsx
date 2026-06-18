"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Card, Badge, Mono } from "@/components/ui";
import { AGENT_ICON } from "@/components/agentIcons";
import { getAgents } from "@/lib/api";
import type { AgentMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

function BuildBadge({ status }: { status: AgentMeta["buildStatus"] }) {
  return (
    <Badge
      className={cn(
        status === "live"
          ? "border-pass/40 bg-pass/10 text-pass"
          : "border-warn/40 bg-warn/10 text-warn",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "live" ? "bg-pass" : "bg-warn",
        )}
      />
      {status}
    </Badge>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentMeta[] | null>(null);

  useEffect(() => {
    getAgents().then(setAgents);
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-fg">Agent directory</h1>
        <p className="text-sm text-muted">
          13 specialist agents + 1 coordinator. Each does exactly one job and returns a
          structured verdict.
        </p>
      </div>

      {!agents ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading agents…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((a) => {
            const Icon = AGENT_ICON[a.id];
            return (
            <Card key={a.id} className="group flex flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand/25 to-brand-2/20 text-brand shadow-[0_4px_16px_-6px_rgba(177,92,255,0.6)]">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-fg">{a.name}</h3>
                    <span className="font-mono text-[10px] text-faint">agent {a.number}</span>
                  </div>
                </div>
                <BuildBadge status={a.buildStatus} />
              </div>

              <p className="text-xs text-muted">{a.job}</p>

              <div className="mt-auto space-y-2 pt-1">
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-faint">
                    verdict shape
                  </div>
                  <Mono className="text-[10px]">{a.verdictShape}</Mono>
                </div>
                {a.rulesFile && (
                  <div className="flex items-center gap-1.5 text-[11px] text-faint">
                    <FileText className="h-3 w-3" />
                    <span className="font-mono">{a.rulesFile}</span>
                  </div>
                )}
                {a.parallelGroup && (
                  <Badge className="border-brand/30 bg-brand/10 text-brand">
                    parallel · {a.parallelGroup}
                  </Badge>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
