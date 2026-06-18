"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AgentMeta } from "@/lib/types";
import type { AgentNodeState } from "@/lib/store";
import { nodeTone, verdictSeverity, severityStyle, statusLabel } from "@/lib/verdict";
import { StatusDot } from "./StatusBadge";
import { AGENT_ICON } from "./agentIcons";

export function AgentNode({
  meta,
  node,
  selected,
  onClick,
}: {
  meta: AgentMeta;
  node: AgentNodeState;
  selected: boolean;
  onClick: () => void;
}) {
  const tone = nodeTone(node.state, node.verdict);
  const sev = verdictSeverity(node.verdict);
  const sevStyle = severityStyle(sev);
  const Icon = AGENT_ICON[meta.id];

  const border =
    tone === "running"
      ? "border-brand/70"
      : tone === "pass"
        ? "border-pass/45"
        : tone === "fail"
          ? sev === "high"
            ? "border-fail/70"
            : sev === "medium"
              ? "border-warn/55"
              : "border-low/55"
          : "border-white/10";

  const glow =
    tone === "running"
      ? "shadow-[0_0_22px_-4px_rgba(177,92,255,0.6)]"
      : tone === "fail"
        ? "shadow-[0_0_22px_-6px_rgba(255,93,108,0.55)]"
        : "";

  const ring = selected ? "ring-2 ring-brand/70 ring-offset-2 ring-offset-[#0c0710]" : "";

  const iconTone =
    tone === "running"
      ? "bg-brand/20 text-brand"
      : tone === "pass"
        ? "bg-pass/15 text-pass"
        : tone === "fail"
          ? "bg-fail/15 text-fail"
          : "bg-white/5 text-muted";

  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      animate={{ opacity: tone === "idle" ? 0.62 : 1 }}
      className={cn(
        "glass-2 group relative w-full select-none rounded-xl border px-3 py-2.5 text-left transition-colors",
        border,
        glow,
        ring,
        tone === "running" && "animate-pulse-ring",
      )}
    >
      <div className="flex items-center gap-2.5">
        <StatusDot state={node.state} verdict={node.verdict} />
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", iconTone)}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-faint">{meta.number}</span>
            <span className="truncate text-sm font-semibold text-fg">{meta.name}</span>
          </div>
          <p className="line-clamp-1 text-[11px] text-faint">{meta.job}</p>
        </div>
        <span
          className={cn(
            "shrink-0 text-[11px] font-medium",
            tone === "pass"
              ? "text-pass"
              : tone === "fail"
                ? "text-fail"
                : tone === "running"
                  ? "text-brand"
                  : "text-faint",
          )}
        >
          {node.state === "running"
            ? "running"
            : node.state === "done"
              ? node.verdict
                ? statusLabel(node.verdict)
                : "done"
              : "idle"}
        </span>
      </div>

      {sevStyle && (
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 rounded border px-1 py-0.5 text-[9px] font-bold",
            sevStyle.className,
          )}
        >
          {sevStyle.label}
        </span>
      )}
    </motion.button>
  );
}
