import type {
  AgentEvent,
  AgentMeta,
  HarnessEntry,
  HarnessFilter,
  RunInput,
} from "./types";
import { AGENTS } from "./agents";
import { MOCK_HARNESS, simulateAnswer, simulateRun } from "./mock";

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

export const USE_MOCK = true;

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
  if (!USE_MOCK) return liveGetHarness(filter);

  // simulate network latency
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
  if (!USE_MOCK) return liveGetAgents();
  return AGENTS;
}

// ============================================================================
// Live backend stubs — implement these against Band when USE_MOCK = false.
// They intentionally throw so a half-wired backend fails loudly, not silently.
// ============================================================================

async function* liveRunPipeline(_input: RunInput): AsyncIterable<AgentEvent> {
  // Example wiring:
  //   const res = await fetch("/api/run", { method: "POST", body: JSON.stringify(_input) });
  //   const reader = res.body!.getReader(); ... parse SSE/ndjson into AgentEvent ...
  throw new Error("liveRunPipeline not implemented — set USE_MOCK=true or wire the Band backend.");
}

async function* liveAnswer(_runId: string, _answer: string): AsyncIterable<AgentEvent> {
  throw new Error("liveAnswer not implemented — set USE_MOCK=true or wire the Band backend.");
}

async function liveGetHarness(_filter?: HarnessFilter): Promise<HarnessEntry[]> {
  throw new Error("liveGetHarness not implemented — set USE_MOCK=true or wire the Band backend.");
}

async function liveGetAgents(): Promise<AgentMeta[]> {
  throw new Error("liveGetAgents not implemented — set USE_MOCK=true or wire the Band backend.");
}
