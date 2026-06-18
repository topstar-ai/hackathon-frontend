"use client";

import { motion } from "framer-motion";
import { CornerLeftUp, RotateCw } from "lucide-react";
import { AGENTS_BY_ID } from "@/lib/agents";
import type { AgentId } from "@/lib/types";
import { useRunStore } from "@/lib/store";
import { AgentNode } from "./AgentNode";
import { cn } from "@/lib/utils";

// Vertical connector between stages. Animates while the run is active.
function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex h-6 justify-center" aria-hidden>
      <svg width="2" height="24" viewBox="0 0 2 24">
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="24"
          className={cn(active ? "stroke-brand animate-dash" : "stroke-border-strong")}
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function Lane({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong/70 bg-panel/40 p-2">
      <div className="mb-2 flex items-center justify-center">
        <span className="rounded-full border border-border-strong bg-panel-2 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-faint">
          {label} · parallel
        </span>
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

export function PipelineGraph() {
  const nodes = useRunStore((s) => s.nodes);
  const selected = useRunStore((s) => s.selectedAgent);
  const select = useRunStore((s) => s.selectAgent);
  const status = useRunStore((s) => s.status);
  const iteration = useRunStore((s) => s.iteration);

  const active = status === "running";
  const looping = status === "awaiting-answer" || iteration > 1;

  const renderNode = (id: AgentId) => (
    <AgentNode
      key={id}
      meta={AGENTS_BY_ID[id]}
      node={nodes[id]}
      selected={selected === id}
      onClick={() => select(selected === id ? null : id)}
    />
  );

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Coordinator banner */}
      {renderNode("coordinator")}
      <Connector active={active} />

      {renderNode("human-logger")}
      <Connector active={active} />

      {renderNode("thinking-logger")}
      <Connector active={active} />

      <Lane label="Profilers">
        {renderNode("human-profiler")}
        {renderNode("engine-profiler")}
      </Lane>
      <Connector active={active} />

      {renderNode("alignment-checker")}

      {/* Alignment loop branch */}
      <div className="relative my-2">
        <div
          className={cn(
            "rounded-xl border p-2 transition-colors",
            looping
              ? "border-warn/50 bg-warn/5"
              : "border-dashed border-border-strong/60 bg-panel/30",
          )}
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
              <RotateCw className={cn("h-3 w-3", looping && active && "animate-spin")} />
              misalignment loop
            </span>
            <span className="rounded border border-border-strong bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              iteration {iteration}
            </span>
          </div>
          {renderNode("question-generator")}
          <motion.div
            className="mt-2 flex items-center gap-1.5 pl-1 text-[10px] text-faint"
            animate={looping ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.6 }}
            transition={{ duration: 1.4, repeat: looping ? Infinity : 0 }}
          >
            <CornerLeftUp className="h-3.5 w-3.5 text-warn" />
            loops back to <span className="font-mono text-warn">03 Human Profiler</span> with the answer
          </motion.div>
        </div>
      </div>

      <Connector active={active} />
      {renderNode("gap-analyzer")}
      <Connector active={active} />

      <Lane label="Checkers">
        {renderNode("constraints")}
        {renderNode("antipatterns")}
        {renderNode("voice")}
        {renderNode("quality")}
        {renderNode("identity")}
      </Lane>
      <Connector active={active} />

      {renderNode("harness-logger")}
    </div>
  );
}
