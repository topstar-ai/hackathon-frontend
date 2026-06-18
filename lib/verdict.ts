import type { Verdict, VerdictTone, Severity, AgentState } from "./types";

// ============================================================================
// Verdict classification — maps any verdict to a tone (pass/fail/neutral) plus
// a display label. Centralized so coloring is consistent everywhere.
// ============================================================================

const PASS_STATUSES = new Set([
  "clean",
  "aligned",
  "no-gap",
  "consistent",
  "logged",
  "profiled",
]);

const FAIL_STATUSES = new Set([
  "violation",
  "misaligned",
  "gap-found",
  "drifted",
  "question-ready",
]);

export function verdictStatus(v: Verdict | undefined): string | null {
  if (!v) return null;
  return (v as { status?: string }).status ?? null;
}

export function verdictTone(v: Verdict | undefined): VerdictTone {
  const status = verdictStatus(v);
  if (!status) return "neutral";
  if (FAIL_STATUSES.has(status)) return "fail";
  if (PASS_STATUSES.has(status)) return "pass";
  return "neutral";
}

export function verdictSeverity(v: Verdict | undefined): Severity {
  if (!v) return null;
  const sev = (v as { severity?: Severity }).severity;
  return sev ?? null;
}

// Returns a node-state tone for coloring, accounting for running/idle.
export function nodeTone(
  state: AgentState,
  v: Verdict | undefined,
): "idle" | "running" | VerdictTone {
  if (state === "idle") return "idle";
  if (state === "running") return "running";
  return verdictTone(v);
}

export interface SeverityStyle {
  label: string;
  className: string;
}

export function severityStyle(sev: Severity): SeverityStyle | null {
  switch (sev) {
    case "high":
      return { label: "HIGH", className: "bg-red-500/15 text-red-300 border-red-500/40" };
    case "medium":
      return { label: "MED", className: "bg-amber-500/15 text-amber-300 border-amber-500/40" };
    case "low":
      return { label: "LOW", className: "bg-yellow-500/15 text-yellow-200 border-yellow-500/40" };
    default:
      return null;
  }
}

// Pretty status label for badges.
export function statusLabel(v: Verdict | undefined): string {
  const s = verdictStatus(v);
  if (!s) return "—";
  return s.replace(/-/g, " ");
}
