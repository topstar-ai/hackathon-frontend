"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, Input, Select, Button } from "@/components/ui";
import { HarnessTable } from "@/components/HarnessTable";
import { AggregatePanel } from "@/components/AggregatePanel";
import { getHarness } from "@/lib/api";
import { VISIBLE_AGENTS } from "@/lib/agents";
import type { HarnessEntry, Severity } from "@/lib/types";

export default function HarnessPage() {
  const [all, setAll] = useState<HarnessEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [agent, setAgent] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState<Severity>(null);

  useEffect(() => {
    let live = true;
    setAll(null);
    setError(null);
    getHarness()
      .then((rows) => live && setAll(rows))
      .catch((e) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);

  // Client-side filtering so the aggregate panel reflects the full dataset.
  const filtered = useMemo(() => {
    if (!all) return [];
    return all.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const hit =
          r.human_input.toLowerCase().includes(q) ||
          r.engine_thinking.toLowerCase().includes(q) ||
          r.final_output.toLowerCase().includes(q) ||
          r.entry_id.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (agent) {
        const agents = [
          r.human_profile.agent,
          r.engine_profile.agent,
          r.alignment.agent,
          r.gap.agent,
          r.constraints_verdict.agent,
          r.antipatterns_verdict.agent,
        ];
        if (!agents.includes(agent)) return false;
      }
      if (status) {
        const statuses: string[] = [
          r.alignment.status,
          r.gap.status,
          r.constraints_verdict.status,
          r.antipatterns_verdict.status,
        ];
        if (!statuses.includes(status)) return false;
      }
      if (severity) {
        if (
          r.constraints_verdict.severity !== severity &&
          r.antipatterns_verdict.severity !== severity
        )
          return false;
      }
      return true;
    });
  }, [all, search, agent, status, severity]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-fg">Harness</h1>
        <p className="text-sm text-muted">
          Searchable history of past turns + aggregate violation stats. Every verdict from
          every run is logged here by agent 13.
        </p>
      </div>

      {all && <AggregatePanel entries={all} />}

      <Card>
        <CardHeader>
          <CardTitle>Past turns</CardTitle>
          <span className="font-mono text-[11px] text-faint">
            {all ? `${filtered.length} / ${all.length}` : "…"}
          </span>
        </CardHeader>

        {/* filters */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <Input
              className="pl-8"
              placeholder="Search input, thinking, output…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="">All agents</option>
            {VISIBLE_AGENTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.number} {a.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            <option value="aligned">aligned</option>
            <option value="misaligned">misaligned</option>
            <option value="gap-found">gap-found</option>
            <option value="no-gap">no-gap</option>
            <option value="clean">clean</option>
            <option value="violation">violation</option>
          </Select>
          <Select
            value={severity ?? ""}
            onChange={(e) => setSeverity((e.target.value || null) as Severity)}
          >
            <option value="">Any severity</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setAgent("");
              setStatus("");
              setSeverity(null);
            }}
          >
            Clear
          </Button>
        </div>

        {error ? (
          <div className="flex items-center justify-center gap-2 py-16 text-fail">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        ) : !all ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading harness…
          </div>
        ) : (
          <HarnessTable entries={filtered} />
        )}
      </Card>
    </div>
  );
}
