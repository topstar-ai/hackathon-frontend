import type {
  AgentEvent,
  AgentId,
  CheckerVerdict,
  RunInput,
  Severity,
  Verdict,
} from "./types";
import { callAgent, extractVerdict, type AgentCallBody } from "./agentClient";

// ============================================================================
// LIVE pipeline orchestration. The frontend plays the coordinator's role:
// it logs the turn, derives profiles, then calls the 8 HTTP agent endpoints
// in the correct order/parallelism and maps each verdict into an AgentEvent.
//
// Endpoints actually called (POST /api/agent/<slug>):
//   05-alignment-classifier · 07-gap-analyzer · 08-constraints-checker
//   09-anti-patterns-checker · 10-voice-checker · 11-quality-checker
//   12-identity-agent · 13-verifier
//
// Orchestration-side agents (01,02,03,04,06,14) have no public endpoint, so
// the coordinator handles them locally — exactly as the real coordinator does.
// Correction fires on any severity "high" verdict (coordinator/ROUTING.md).
// ============================================================================

function now(): string {
  return new Date().toISOString();
}
function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function ev(
  runId: string,
  agentId: AgentId,
  state: AgentEvent["state"],
  extra: Partial<AgentEvent> = {},
): AgentEvent {
  return { runId, agentId, state, timestamp: now(), ...extra };
}

const MAX_ITERATIONS = 4;

interface PausedRun {
  input: RunInput;
  iteration: number;
}
const pausedRuns = new Map<string, PausedRun>();

// --- normalizers ----------------------------------------------------------

function normSeverity(s: unknown): Severity {
  if (s === "high" || s === "medium" || s === "low") return s;
  return null;
}

function normChecker(agent: string, raw: Record<string, unknown> | null): Verdict {
  if (agent === "identity") {
    const status = raw?.status === "drifted" ? "drifted" : "consistent";
    return {
      agent: "identity",
      status,
      reason: (raw?.reason as string) ?? null,
    };
  }
  const isViolation =
    raw?.status === "violation" || raw?.status === "flagged" || raw?.status === "fail";
  const v: CheckerVerdict = {
    agent,
    status: isViolation ? "violation" : "clean",
    rule: isViolation ? ((raw?.rule as string) ?? null) : null,
    excerpt: isViolation ? ((raw?.excerpt as string) ?? null) : null,
    severity: isViolation ? normSeverity(raw?.severity) : null,
  };
  return v;
}

function normAlignment(raw: Record<string, unknown> | null): Verdict {
  const status = raw?.status === "misaligned" ? "misaligned" : "aligned";
  return { agent: "alignment-checker", status, reason: (raw?.reason as string) ?? null };
}

function normGap(raw: Record<string, unknown> | null): Verdict {
  const gap = (raw?.gap as string) ?? null;
  const status = raw?.status === "gap-found" || (gap && raw?.status !== "no-gap") ? "gap-found" : "no-gap";
  return { agent: "gap-analyzer", status, gap: status === "gap-found" ? gap : null };
}

// Derive lightweight profiles (03/04 have no public endpoint).
function deriveProfile(
  agent: "human-profiler" | "engine-profiler",
  input: RunInput,
): Verdict {
  if (agent === "human-profiler") {
    return {
      agent,
      status: "profiled",
      id: "human:turn",
      role: "Human requester",
      scope: input.humanMessage.slice(0, 120),
    };
  }
  return {
    agent,
    status: "profiled",
    id: "engine:assistant",
    role: "AI engine",
    scope: (input.engineThinking || input.proposedOutput).slice(0, 120),
  };
}

// --- phases ----------------------------------------------------------------

async function* profilersPhase(
  runId: string,
  input: RunInput,
  iteration: number,
): AsyncIterable<AgentEvent> {
  yield ev(runId, "human-profiler", "running", { iteration, message: "Profiling human (coordinator)" });
  yield ev(runId, "engine-profiler", "running", { iteration, message: "Profiling engine (coordinator)" });
  yield ev(runId, "human-profiler", "done", { iteration, verdict: deriveProfile("human-profiler", input), message: "Human profiled" });
  yield ev(runId, "engine-profiler", "done", { iteration, verdict: deriveProfile("engine-profiler", input), message: "Engine profiled" });
}

async function callAlignment(input: RunInput, iteration: number): Promise<Verdict> {
  const body: AgentCallBody = {
    message: `HUMAN INPUT:\n${input.humanMessage}\n\nENGINE OUTPUT:\n${input.proposedOutput}\n\nENGINE THINKING:\n${input.engineThinking}`,
    human_input: input.humanMessage,
    engine_thinking: input.engineThinking,
    engine_output: input.proposedOutput,
    iteration,
  };
  return normAlignment(extractVerdict<Record<string, unknown>>(await callAgent("05-alignment-classifier", body)));
}

// The five checkers (08–12) fired in parallel; done events stream as each settles.
async function* checkersPhase(
  runId: string,
  input: RunInput,
  gap: string | null,
  collected: Record<string, Verdict>,
): AsyncIterable<AgentEvent> {
  const jobs: { id: AgentId; slug: string; body: AgentCallBody }[] = [
    { id: "constraints", slug: "08-constraints-checker", body: { message: input.proposedOutput, engine_output: input.proposedOutput } },
    { id: "antipatterns", slug: "09-anti-patterns-checker", body: { message: gap ?? input.proposedOutput, engine_output: input.proposedOutput, gap } },
    { id: "voice", slug: "10-voice-checker", body: { message: input.proposedOutput, engine_output: input.proposedOutput } },
    { id: "quality", slug: "11-quality-checker", body: { message: input.proposedOutput, engine_output: input.proposedOutput, human_input: input.humanMessage } },
    { id: "identity", slug: "12-identity-agent", body: { message: input.proposedOutput, engine_output: input.proposedOutput } },
  ];

  for (const j of jobs) yield ev(runId, j.id, "running", { message: `Checking: ${j.id}` });

  const pending = new Map<
    number,
    Promise<{ i: number; id: AgentId; raw: Record<string, unknown> | null; error?: string }>
  >();
  jobs.forEach((j, i) => {
    pending.set(
      i,
      callAgent(j.slug, j.body)
        .then((r) => ({ i, id: j.id, raw: extractVerdict<Record<string, unknown>>(r) }))
        .catch((e) => ({ i, id: j.id, raw: null, error: e instanceof Error ? e.message : String(e) })),
    );
  });

  while (pending.size) {
    const settled = await Promise.race(pending.values());
    pending.delete(settled.i);
    // coordinator rule: an agent error is treated as clean and logged, never blocks.
    const verdict = normChecker(settled.id, settled.raw);
    collected[settled.id] = verdict;
    const status = (verdict as { status: string }).status;
    yield ev(runId, settled.id, "done", {
      verdict,
      message: settled.error ? `${settled.id}: error → treated clean (${settled.error})` : `${settled.id}: ${status}`,
    });
  }
}

function highViolation(collected: Record<string, Verdict>): boolean {
  return Object.values(collected).some(
    (v) => (v as { status?: string }).status === "violation" && (v as { severity?: Severity }).severity === "high",
  );
}
function anyViolation(collected: Record<string, Verdict>): boolean {
  return Object.values(collected).some((v) => {
    const s = (v as { status?: string }).status;
    return s === "violation" || s === "drifted";
  });
}

async function* postAlignment(
  runId: string,
  input: RunInput,
): AsyncIterable<AgentEvent> {
  // 07 Gap analyzer (LIVE)
  yield ev(runId, "gap-analyzer", "running", { message: "Analyzing gap" });
  let gap: string | null = null;
  try {
    const gapV = normGap(
      extractVerdict<Record<string, unknown>>(
        await callAgent("07-gap-analyzer", {
          message: `HUMAN INPUT:\n${input.humanMessage}\n\nENGINE OUTPUT:\n${input.proposedOutput}`,
          human_input: input.humanMessage,
          engine_output: input.proposedOutput,
        }),
      ),
    );
    gap = (gapV as { gap: string | null }).gap;
    yield ev(runId, "gap-analyzer", "done", { verdict: gapV, message: `gap: ${(gapV as { status: string }).status}` });
  } catch (e) {
    const gapV: Verdict = { agent: "gap-analyzer", status: "no-gap", gap: null };
    yield ev(runId, "gap-analyzer", "done", { verdict: gapV, message: `gap-analyzer error → no-gap (${e instanceof Error ? e.message : e})` });
  }

  // 08–12 checkers (LIVE, parallel)
  const collected: Record<string, Verdict> = {};
  yield* checkersPhase(runId, input, gap, collected);

  const mustCorrect = highViolation(collected);
  const flagged = anyViolation(collected);

  // 14 Coordinator → correction decision
  yield ev(runId, "coordinator", "running", {
    message: mustCorrect ? "High-severity violation — correcting output…" : flagged ? "Violations logged (below correction threshold)" : "All checks clean",
    correction: mustCorrect ? { status: "correcting", original: input.proposedOutput } : { status: "none" },
  });

  // 13 Verifier (LIVE): verifies verdicts, drives correction, logs the record.
  let finalOutput = input.proposedOutput;
  let corrected = false;
  let entryId = "";
  try {
    const raw = await callAgent<Record<string, unknown>>("13-verifier", {
      message: `Verify and finalize. ${mustCorrect ? "Correction required (high severity)." : ""}`,
      human_input: input.humanMessage,
      engine_thinking: input.engineThinking,
      engine_output: input.proposedOutput,
      gap,
      verdicts: Object.values(collected),
    });
    const v = (extractVerdict<Record<string, unknown>>(raw) ?? raw) as Record<string, unknown>;
    if (typeof v.output === "string" && v.output.length) finalOutput = v.output as string;
    else if (typeof v.corrected_output === "string") finalOutput = v.corrected_output as string;
    corrected = v.corrected === true || (finalOutput !== input.proposedOutput);
    entryId = (v.entry_id as string) ?? (v.log_id as string) ?? "";
  } catch (e) {
    // verifier unreachable → deliver original (coordinator never blocks on agent error)
    corrected = false;
    yield ev(runId, "coordinator", "done", { message: `verifier error → delivering original (${e instanceof Error ? e.message : e})` });
  }

  if (corrected && finalOutput !== input.proposedOutput) {
    yield ev(runId, "coordinator", "done", {
      message: "Output corrected",
      correction: { status: "corrected", original: input.proposedOutput, corrected: finalOutput },
    });
  } else if (!mustCorrect) {
    yield ev(runId, "coordinator", "done", { message: "Delivering output", correction: { status: "none" } });
  }

  // 13 Harness logger record
  yield ev(runId, "harness-logger", "running", { message: "Logging verdicts to harness" });
  yield ev(runId, "harness-logger", "done", {
    verdict: { agent: "human-logger", status: "logged", input: entryId || "(verdicts persisted)", timestamp: now() } as Verdict,
    message: entryId ? `Logged to harness (${entryId})` : "Run logged to harness",
  });

  // terminal
  yield ev(runId, "coordinator", "done", {
    message: corrected ? "Delivered (corrected)" : "Delivered",
    finalOutput,
  });
}

// --- entry points ----------------------------------------------------------

export async function* liveRunPipeline(input: RunInput): AsyncIterable<AgentEvent> {
  const runId = newRunId();
  yield ev(runId, "coordinator", "running", { message: "Coordinator starting run", iteration: 1 });

  // 01 / 02 loggers (orchestration)
  yield ev(runId, "human-logger", "running", { message: "Logging human input" });
  yield ev(runId, "human-logger", "done", {
    verdict: { agent: "human-logger", status: "logged", input: input.humanMessage, timestamp: now() },
    message: "Human input logged",
  });
  yield ev(runId, "thinking-logger", "running", { message: "Logging engine thinking" });
  yield ev(runId, "thinking-logger", "done", {
    verdict: { agent: "thinking-logger", status: "logged", thinking: input.engineThinking, timestamp: now() },
    message: "Engine thinking logged",
  });

  // 03 / 04 profilers (orchestration)
  yield* profilersPhase(runId, input, 1);

  // 05 alignment (LIVE)
  yield ev(runId, "alignment-checker", "running", { iteration: 1, message: "Checking alignment" });
  let alignment: Verdict;
  try {
    alignment = await callAlignment(input, 1);
  } catch (e) {
    // if the very first live call fails, surface a clear error so the UI can fall back.
    throw new Error(`Live backend unreachable: ${e instanceof Error ? e.message : e}`);
  }
  yield ev(runId, "alignment-checker", "done", { iteration: 1, verdict: alignment, message: (alignment as { status: string }).status });

  if ((alignment as { status: string }).status === "misaligned") {
    const reason = (alignment as { reason: string | null }).reason;
    yield ev(runId, "question-generator", "running", { iteration: 1, message: "Generating clarifying question" });
    const question = {
      agent: "question-generator" as const,
      status: "question-ready" as const,
      question: `To realign: ${reason ?? "your intent and the engine's scope differ"}. Could you clarify what you're actually looking for?`,
    };
    yield ev(runId, "question-generator", "done", { iteration: 1, verdict: question, pendingQuestion: question, message: "Question ready — awaiting human answer" });
    pausedRuns.set(runId, { input, iteration: 1 });
    return;
  }

  yield* postAlignment(runId, input);
}

export async function* liveAnswer(runId: string, answer: string): AsyncIterable<AgentEvent> {
  const paused = pausedRuns.get(runId);
  if (!paused) {
    yield ev(runId, "coordinator", "done", { message: `No paused run for ${runId}` });
    return;
  }
  pausedRuns.delete(runId);
  const iteration = paused.iteration + 1;

  // fold the human's answer into the human input for re-profiling/alignment
  const input: RunInput = {
    ...paused.input,
    humanMessage: `${paused.input.humanMessage}\n\n[clarification] ${answer}`,
  };

  yield ev(runId, "coordinator", "running", { iteration, message: `Human answered — re-running alignment (iteration ${iteration})` });
  yield* profilersPhase(runId, input, iteration);

  yield ev(runId, "alignment-checker", "running", { iteration, message: "Re-checking alignment" });
  let alignment: Verdict;
  try {
    alignment = await callAlignment(input, iteration);
  } catch (e) {
    throw new Error(`Live backend unreachable: ${e instanceof Error ? e.message : e}`);
  }
  yield ev(runId, "alignment-checker", "done", { iteration, verdict: alignment, message: (alignment as { status: string }).status });

  if ((alignment as { status: string }).status === "misaligned" && iteration < MAX_ITERATIONS) {
    const reason = (alignment as { reason: string | null }).reason;
    yield ev(runId, "question-generator", "running", { iteration, message: "Generating clarifying question" });
    const question = {
      agent: "question-generator" as const,
      status: "question-ready" as const,
      question: `Still misaligned: ${reason ?? "the scopes differ"}. Can you be more specific about the outcome you want?`,
    };
    yield ev(runId, "question-generator", "done", { iteration, verdict: question, pendingQuestion: question, message: "Question ready — awaiting human answer" });
    pausedRuns.set(runId, { input, iteration });
    return;
  }

  yield* postAlignment(runId, input);
}
