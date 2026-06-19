import type {
  AgentEvent,
  AgentMeta,
  HarnessEntry,
  HarnessFilter,
  RunInput,
} from "./types";
import { AGENTS } from "./agents";
import { MOCK_HARNESS, simulateAnswer, simulateRun } from "./mock";
import { liveAnswer, liveRunPipeline } from "./liveRun";
import { USE_MOCK as USE_MOCK_FLAG } from "./config";

// ============================================================================
// Data layer. Flip USE_MOCK to false and implement the `live*` functions to
// wire the real Band backend. Components ONLY import from here — they never
// touch mock data directly, so swapping the source changes nothing in the UI.
//
// Real backend contract (Band + LangGraph + Claude):
//   - The coordinator (agent 14) owns a Band session per run.
//   - Each specialist agent is a Band remote agent that emits a verdict.
//   - Stream those verdicts to the client over WebSocket or SSE, mapping each
//     into the AgentEvent shape below. runPipeline/answerAlignmentQuestion just
//     need to yield AgentEvents in arrival order.
// ============================================================================

// Re-exported so components/store read the single source of truth (lib/config).
export const USE_MOCK = USE_MOCK_FLAG;

// ----------------------------------------------------------------------------
// runPipeline — submit a turn, stream agent events in pipeline order.
// ----------------------------------------------------------------------------
export function runPipeline(input: RunInput): AsyncIterable<AgentEvent> {
  if (USE_MOCK) return simulateRun(input);
  return liveRunPipeline(input);
}

// ----------------------------------------------------------------------------
// answerAlignmentQuestion — resume a paused run after the human answers the
// alignment-checker's generated question. Re-enters at the profilers (03/04).
// ----------------------------------------------------------------------------
export function answerAlignmentQuestion(
  runId: string,
  answer: string,
): AsyncIterable<AgentEvent> {
  if (USE_MOCK) return simulateAnswer(runId, answer);
  return liveAnswer(runId, answer);
}

// ----------------------------------------------------------------------------
// getHarness — historical turns, optionally filtered.
// ----------------------------------------------------------------------------
export async function getHarness(
  filter?: HarnessFilter,
): Promise<HarnessEntry[]> {
  // The gateway exposes per-agent verdict endpoints but no harness *read* API,
  // so history is served from the seeded harness. To wire a real read, point
  // this at e.g. GET ${AGENT_API_BASE}/api/harness and map rows to HarnessEntry.
  await new Promise((r) => setTimeout(r, 250));
  let rows = [...MOCK_HARNESS];

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.human_input.toLowerCase().includes(q) ||
        r.engine_thinking.toLowerCase().includes(q) ||
        r.final_output.toLowerCase().includes(q) ||
        r.entry_id.toLowerCase().includes(q),
    );
  }
  if (filter?.status) {
    rows = rows.filter((r) =>
      (
        [
          r.alignment.status,
          r.gap.status,
          r.constraints_verdict.status,
          r.antipatterns_verdict.status,
        ] as string[]
      ).includes(filter.status as string),
    );
  }
  if (filter?.severity) {
    rows = rows.filter(
      (r) =>
        r.constraints_verdict.severity === filter.severity ||
        r.antipatterns_verdict.severity === filter.severity,
    );
  }
  if (filter?.agent) {
    rows = rows.filter((r) =>
      [
        r.human_profile.agent,
        r.engine_profile.agent,
        r.alignment.agent,
        r.gap.agent,
        r.constraints_verdict.agent,
        r.antipatterns_verdict.agent,
      ].includes(filter.agent as string),
    );
  }
  return rows;
}

// ----------------------------------------------------------------------------
// getAgents — static agent directory metadata.
// ----------------------------------------------------------------------------
export async function getAgents(): Promise<AgentMeta[]> {
  // Agent directory is static config (mirrors the real agents + endpoints).
  return AGENTS;
}
