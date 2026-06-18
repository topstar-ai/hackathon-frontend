// ============================================================================
// Drift Agent — domain types. These are the source of truth for the UI.
// Mirror these exactly when wiring the real Band backend (see lib/api.ts).
// ============================================================================

export type Severity = "high" | "medium" | "low" | null;

// --- Verdict shapes -------------------------------------------------------

// Agents 08, 09, 10, 11 — constraints, anti-patterns, voice, quality
export interface CheckerVerdict {
  agent: string;
  status: "clean" | "violation";
  rule: string | null; // e.g. "Q03 — No unanswered question"
  excerpt: string | null; // exact offending text, or description of what's missing
  severity: Severity;
}

export interface HumanLog {
  agent: "human-logger";
  status: "logged";
  input: string;
  timestamp: string;
}

export interface ThinkingLog {
  agent: "thinking-logger";
  status: "logged";
  thinking: string;
  timestamp: string;
}

export interface Profile {
  agent: "human-profiler" | "engine-profiler";
  status: "profiled";
  id: string;
  role: string;
  scope: string;
}

// Shape exception: status + reason (no rule/excerpt/severity)
export interface Alignment {
  agent: "alignment-checker";
  status: "aligned" | "misaligned";
  reason: string | null;
}

export interface Question {
  agent: "question-generator";
  status: "question-ready";
  question: string;
}

export interface Gap {
  agent: "gap-analyzer";
  status: "gap-found" | "no-gap";
  gap: string | null;
}

// Shape exception: status + reason (NOT rule/excerpt/severity)
export interface Identity {
  agent: "identity";
  status: "consistent" | "drifted";
  reason: string | null;
}

export type Verdict =
  | CheckerVerdict
  | HumanLog
  | ThinkingLog
  | Profile
  | Alignment
  | Question
  | Gap
  | Identity;

// --- Harness --------------------------------------------------------------

export interface HarnessEntry {
  entry_id: string;
  timestamp: string;
  human_input: string;
  engine_thinking: string;
  human_profile: Profile;
  engine_profile: Profile;
  alignment: Alignment;
  gap: Gap;
  constraints_verdict: CheckerVerdict;
  antipatterns_verdict: CheckerVerdict;
  final_output: string;
}

// --- Pipeline / run state -------------------------------------------------

export type AgentId =
  | "human-logger"
  | "thinking-logger"
  | "human-profiler"
  | "engine-profiler"
  | "alignment-checker"
  | "question-generator"
  | "gap-analyzer"
  | "constraints"
  | "antipatterns"
  | "voice"
  | "quality"
  | "identity"
  | "harness-logger"
  | "coordinator";

// Lifecycle state of a node in the graph.
export type AgentState = "idle" | "running" | "done";

// Final verdict status buckets that drive coloring.
export type VerdictTone = "pass" | "fail" | "neutral";

export interface AgentMeta {
  id: AgentId;
  number: string; // "01".."14"
  name: string;
  job: string; // one-job description
  buildStatus: "live" | "pending";
  verdictShape: string; // human-readable description of return shape
  rulesFile?: string;
  // layout hints for the pipeline graph
  parallelGroup?: string; // nodes sharing a group render side by side
}

// A streamed event from the pipeline.
export interface AgentEvent {
  runId: string;
  agentId: AgentId;
  state: AgentState;
  verdict?: Verdict;
  // loop iteration this event belongs to (alignment loop re-enters profilers)
  iteration?: number;
  // human-readable log line for the live event log
  message?: string;
  timestamp: string;
  // when set, the coordinator is asking the human a question (loop)
  pendingQuestion?: Question;
  // correction phase signalling
  correction?: {
    status: "correcting" | "corrected" | "none";
    original?: string;
    corrected?: string;
  };
  // terminal event for the run with the final delivered output
  finalOutput?: string;
}

export interface RunInput {
  humanMessage: string;
  engineThinking: string;
  proposedOutput: string;
}

export interface HarnessFilter {
  agent?: string;
  status?: string;
  severity?: Severity;
  search?: string;
}
