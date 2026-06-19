import type { AgentMeta, AgentId } from "./types";

// ============================================================================
// Static config for the 14 Drift agents. Pipeline order + parallel grouping
// here drive the graph layout. Backend identity (endpoint / runtime / model)
// mirrors the real system in D:\git\hackathon-drift-agent:
//   - Each specialist is a Band remote agent (LangGraph single-node graph,
//     Claude Sonnet 4.6) reached through the agent gateway.
//   - 8 verdict-producing agents are exposed over HTTP (POST /api/agent/<slug>).
//   - Loggers, profilers, question-generator and coordinator are
//     orchestration-side (driven by the coordinator, no public endpoint).
// ============================================================================

const RUNTIME = "Band · LangGraph";
const MODEL = "claude-sonnet-4-6";

export const AGENTS: AgentMeta[] = [
  {
    id: "human-logger",
    number: "01",
    name: "Human Logger",
    job: "Log the human's input verbatim, untouched.",
    buildStatus: "live",
    verdictShape: "{ status: 'logged', input, timestamp }",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-human-logger/",
  },
  {
    id: "thinking-logger",
    number: "02",
    name: "Thinking Logger",
    job: "Log the engine's internal thinking verbatim (extended thinking).",
    buildStatus: "live",
    verdictShape: "{ status: 'logged', thinking, timestamp }",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-thinking-logger/",
  },
  {
    id: "human-profiler",
    number: "03",
    name: "Human Profiler",
    job: "Tag the human ID and define their role and scope in this conversation.",
    buildStatus: "live",
    verdictShape: "{ status: 'profiled', id, role, scope }",
    parallelGroup: "profilers",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-human-profiler/",
  },
  {
    id: "engine-profiler",
    number: "04",
    name: "Engine Profiler",
    job: "Tag the engine ID and define its role and scope in this conversation.",
    buildStatus: "live",
    verdictShape: "{ status: 'profiled', id, role, scope }",
    parallelGroup: "profilers",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-engine-profiler/",
  },
  {
    id: "alignment-checker",
    number: "05",
    name: "Alignment Classifier",
    job: "Compare human role/scope vs engine role/scope → aligned | misaligned + reason.",
    buildStatus: "live",
    verdictShape: "{ status: 'aligned' | 'misaligned', reason }",
    exposure: "http",
    endpoint: "05-alignment-classifier",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-alignment-checker/",
  },
  {
    id: "question-generator",
    number: "06",
    name: "Question Generator",
    job: "On misalignment, generate one question for the human that resolves the gap.",
    buildStatus: "live",
    verdictShape: "{ status: 'question-ready', question }",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-question-generator/",
  },
  {
    id: "gap-analyzer",
    number: "07",
    name: "Gap Analyzer",
    job: "Compare what the human asked vs what the engine produced → describe the gap.",
    buildStatus: "live",
    verdictShape: "{ status: 'gap-found' | 'no-gap', gap }",
    exposure: "http",
    endpoint: "07-gap-analyzer",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-gap-analyzer/",
  },
  {
    id: "constraints",
    number: "08",
    name: "Constraints Checker",
    job: "Check the output against the hard-constraints library. Flag violations.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    exposure: "http",
    endpoint: "08-constraints-checker",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-constraints/",
  },
  {
    id: "antipatterns",
    number: "09",
    name: "Anti-patterns Checker",
    job: "Check the output against the anti-patterns library. Flag matches.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    exposure: "http",
    endpoint: "09-anti-patterns-checker",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-antipatterns/",
  },
  {
    id: "voice",
    number: "10",
    name: "Voice Checker",
    job: "Check the output against voice rules. Flag tone and style violations.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    exposure: "http",
    endpoint: "10-voice-checker",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-voice-checker/",
  },
  {
    id: "quality",
    number: "11",
    name: "Quality Checker",
    job: "Check the output against quality criteria. Flag completeness/accuracy failures.",
    buildStatus: "live",
    verdictShape: "{ status: 'clean' | 'violation', rule, excerpt, severity }",
    parallelGroup: "checkers",
    exposure: "http",
    endpoint: "11-quality-checker",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-quality-checker/",
  },
  {
    id: "identity",
    number: "12",
    name: "Identity Agent",
    job: "Check the response is consistent with the engine's identity. Flag persona drift.",
    buildStatus: "live",
    verdictShape: "{ status: 'consistent' | 'drifted', reason }",
    parallelGroup: "checkers",
    exposure: "http",
    endpoint: "12-identity-agent",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-identity/",
  },
  {
    id: "harness-logger",
    number: "13",
    name: "Verifier",
    job: "Verify verdicts, drive correction, log the conversation record to the harness.",
    buildStatus: "live",
    verdictShape: "{ output, corrected, verdicts[], log_id }",
    exposure: "http",
    endpoint: "13-verifier",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "agent-harness-logger/",
  },
  {
    id: "coordinator",
    number: "14",
    name: "Coordinator",
    job: "Route messages between agents, control the loop, decide when to correct/deliver.",
    buildStatus: "live",
    verdictShape: "orchestration — routes, never edits",
    exposure: "orchestration",
    runtime: RUNTIME,
    model: MODEL,
    rulesFile: "coordinator/",
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

// Only agents with a real HTTP endpoint are surfaced in the UI. Orchestration-
// only agents (loggers, profilers, question-generator, coordinator) still run
// behind the scenes but are hidden from the graph / directory / logs.
export const VISIBLE_AGENTS: AgentMeta[] = AGENTS.filter(
  (a) => a.exposure === "http",
);

export function isVisibleAgent(id: AgentId): boolean {
  return AGENTS_BY_ID[id]?.exposure === "http";
}

// Endpoint slug → AgentId (handy for the proxy / debugging).
export const ENDPOINT_TO_AGENT: Record<string, AgentId> = AGENTS.reduce(
  (acc, a) => {
    if (a.endpoint) acc[a.endpoint] = a.id;
    return acc;
  },
  {} as Record<string, AgentId>,
);
