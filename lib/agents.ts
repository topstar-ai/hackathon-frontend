import type { AgentMeta, AgentId } from "./types";

// ============================================================================
// Static config of the 14 agents. Order + parallel grouping here drives the
// pipeline graph layout. Keep numbers/order in sync with the backend.
// ============================================================================

export const AGENTS: AgentMeta[] = [
  {
    id: "human-logger",
    number: "01",
    name: "Human Logger",
    job: "Logs the human's input verbatim, untouched.",
    buildStatus: "live",
    verdictShape: "{ status: 'logged', input, timestamp }",
    rulesFile: "rules/logging.md",
  },
  {
    id: "thinking-logger",
    number: "02",
    name: "Thinking Logger",
    job: "Logs the engine's internal thinking verbatim.",
    buildStatus: "live",
    verdictShape: "{ status: 'logged', thinking, timestamp }",
    rulesFile: "rules/logging.md",
  },
  {
    id: "human-profiler",
    number: "03",
    name: "Human Profiler",
    job: "Profiles the human: who they are, role, scope of the ask.",
    buildStatus: "live",
    verdictShape: "{ status: 'profiled', id, role, scope }",
    parallelGroup: "profilers",
    rulesFile: "rules/profiling.md",
  },
  {
    id: "engine-profiler",
    number: "04",
    name: "Engine Profiler",
    job: "Profiles the engine: its assumed identity, role, scope.",
    buildStatus: "live",
    verdictShape: "{ status: 'profiled', id, role, scope }",
    parallelGroup: "profilers",
    rulesFile: "rules/profiling.md",
  },
  {
    id: "alignment-checker",
    number: "05",
    name: "Alignment Checker",
    job: "Compares the two profiles → aligned | misaligned.",
    buildStatus: "live",
    verdictShape: "{ status: 'aligned' | 'misaligned', reason }",
    rulesFile: "rules/alignment.md",
  },
  {
    id: "question-generator",
    number: "06",
    name: "Question Generator",
    job: "On misalignment, emits one clarifying question to the human.",
    buildStatus: "live",
    verdictShape: "{ status: 'question-ready', question }",
    rulesFile: "rules/questions.md",
  },
  {
    id: "gap-analyzer",
    number: "07",
    name: "Gap Analyzer",
    job: "Compares what the human asked vs what the engine produced.",
    buildStatus: "live",
    verdictShape: "{ status: 'gap-found' | 'no-gap', gap }",
    rulesFile: "rules/gap.md",
  },
  {
    id: "constraints",
    number: "08",
    name: "Constraints",
    job: "Checks the output against hard constraints / requirements.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    rulesFile: "rules/constraints.md",
  },
  {
    id: "antipatterns",
    number: "09",
    name: "Anti-patterns",
    job: "Flags known anti-patterns in the proposed output.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    rulesFile: "rules/antipatterns.md",
  },
  {
    id: "voice",
    number: "10",
    name: "Voice",
    job: "Verifies tone & voice match the expected register.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    rulesFile: "rules/voice.md",
  },
  {
    id: "quality",
    number: "11",
    name: "Quality",
    job: "Checks output quality, completeness, and correctness signals.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    rulesFile: "rules/quality.md",
  },
  {
    id: "identity",
    number: "12",
    name: "Identity",
    job: "Detects identity drift in the engine's persona/stance.",
    buildStatus: "live",
    verdictShape: "{ status: 'consistent' | 'drifted', reason }",
    parallelGroup: "checkers",
    rulesFile: "rules/identity.md",
  },
  {
    id: "harness-logger",
    number: "13",
    name: "Harness Logger",
    job: "Persists every verdict from the run into the harness.",
    buildStatus: "live",
    verdictShape: "{ status: 'logged', ... }",
    rulesFile: "rules/logging.md",
  },
  {
    id: "coordinator",
    number: "14",
    name: "Coordinator",
    job: "Orchestrates state, routing, loop control, and corrections.",
    buildStatus: "live",
    verdictShape: "orchestration — no verdict of its own",
    rulesFile: "rules/coordinator.md",
  },
];

export const AGENTS_BY_ID: Record<AgentId, AgentMeta> = AGENTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<AgentId, AgentMeta>,
);

export function agentLabel(id: AgentId): string {
  const a = AGENTS_BY_ID[id];
  return a ? `${a.number} ${a.name}` : id;
}
