"use client";

import {
  Check,
  X,
  AlertTriangle,
  Loader2,
  Circle,
  HelpCircle,
} from "lucide-react";
import { Badge } from "./ui";
import { cn } from "@/lib/utils";
import type { Verdict, VerdictTone } from "@/lib/types";
import { statusLabel, verdictTone } from "@/lib/verdict";

// Pass/fail communicated with icon + label + color — never color alone.
export function StatusBadge({
  verdict,
  className,
}: {
  verdict?: Verdict;
  className?: string;
}) {
  const tone = verdictTone(verdict);
  const label = statusLabel(verdict);
  const map: Record<
    VerdictTone,
    { Icon: typeof Check; cls: string }
  > = {
    pass: { Icon: Check, cls: "border-pass/40 bg-pass/10 text-pass" },
    fail: { Icon: AlertTriangle, cls: "border-fail/40 bg-fail/10 text-fail" },
    neutral: { Icon: Circle, cls: "border-border-strong bg-panel-2 text-muted" },
  };
  // question-ready reads better with a question icon
  const status = (verdict as { status?: string })?.status;
  const Icon = status === "question-ready" ? HelpCircle : map[tone].Icon;
  return (
    <Badge className={cn(map[tone].cls, className)}>
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {label}
    </Badge>
  );
}

// Small status dot (reference-style) for the verdict rows.
export function StatusDot({
  state,
  verdict,
  className,
}: {
  state: "idle" | "running" | "done";
  verdict?: Verdict;
  className?: string;
}) {
  if (state === "idle")
    return <span className={cn("dot bg-faint/50", className)} />;
  if (state === "running")
    return <span className={cn("dot bg-brand animate-dot", className)} />;
  const tone = verdictTone(verdict);
  const cls =
    tone === "pass" ? "bg-pass" : tone === "fail" ? "bg-fail" : "bg-muted";
  const glow =
    tone === "pass"
      ? "shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      : tone === "fail"
        ? "shadow-[0_0_8px_rgba(255,93,108,0.8)]"
        : "";
  return <span className={cn("dot", cls, glow, className)} />;
}

export function StateBadge({
  state,
  className,
}: {
  state: "idle" | "running" | "done";
  className?: string;
}) {
  if (state === "running") {
    return (
      <Badge className={cn("border-brand/40 bg-brand/10 text-brand", className)}>
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} />
        running
      </Badge>
    );
  }
  if (state === "idle") {
    return (
      <Badge className={cn("border-border-strong bg-panel-2 text-faint", className)}>
        <Circle className="h-3 w-3" strokeWidth={2.5} />
        idle
      </Badge>
    );
  }
  return (
    <Badge className={cn("border-border-strong bg-panel-2 text-muted", className)}>
      <Check className="h-3 w-3" strokeWidth={2.5} />
      done
    </Badge>
  );
}

export { X };
