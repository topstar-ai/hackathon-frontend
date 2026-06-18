import type {
  AgentEvent,
  AgentId,
  HarnessEntry,
  Question,
  RunInput,
  Verdict,
} from "./types";

// ============================================================================
// Mock streaming run + sample harness data. This emulates the Band backend:
// a coordinator drives agents that emit verdict events over time. The real
// backend (WebSocket/SSE) must yield the same AgentEvent shape — see lib/api.ts.
// ============================================================================

const STEP = 480; // ms between sequential agents
const PARALLEL = 720; // ms for a parallel group to settle

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function now(): string {
  return new Date().toISOString();
}

function newRunId(): string {
  return `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// In-flight runs paused awaiting a human answer to the alignment question.
interface PausedRun {
  input: RunInput;
  iteration: number;
}
const pausedRuns = new Map<string, PausedRun>();

function ev(
  runId: string,
  agentId: AgentId,
  state: AgentEvent["state"],
  extra: Partial<AgentEvent> = {},
): AgentEvent {
  return {
    runId,
    agentId,
    state,
    timestamp: now(),
    ...extra,
  };
}

function isCleanScenario(input: RunInput): boolean {
  const blob = `${input.humanMessage} ${input.engineThinking}`.toLowerCase();
  return blob.includes("[clean]") || blob.includes("aligned demo");
}

// --- Verdict fixtures used by the simulated run ---------------------------

const humanProfile = (iteration: number): Verdict => ({
  agent: "human-profiler",
  status: "profiled",
  id: "human:eng-01",
  role: "Backend engineer",
  scope:
    iteration === 1
      ? "Wants a rate limiter for the payments API"
      : "Wants production-ready token-bucket rate limiter code for the payments API",
});

const engineProfile = (iteration: number): Verdict => ({
  agent: "engine-profiler",
  status: "profiled",
  id: "engine:assistant",
  role: iteration === 1 ? "General explainer" : "Implementation engineer",
  scope:
    iteration === 1
      ? "Explaining rate-limiting concepts at a high level"
      : "Implementing a token-bucket rate limiter in Python",
});

const QUESTION: Question = {
  agent: "question-generator",
  status: "question-ready",
  question:
    "Are you looking for production-ready code for your payments API, or a conceptual explanation of rate limiting?",
};

const ORIGINAL_OUTPUT =
  "Here's a rate limiter. I think this might possibly work for your case:\n\nwhile True:\n    if allow_request():\n        handle()\n    retry()  # keep trying until it goes through";

const CORRECTED_OUTPUT =
  "Here's a production-ready token-bucket rate limiter for the payments API:\n\nclass TokenBucket:\n    def __init__(self, rate, capacity):\n        self.rate = rate\n        self.capacity = capacity\n        self.tokens = capacity\n        self.updated = time.monotonic()\n\n    def allow(self):\n        now = time.monotonic()\n        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)\n        self.updated = now\n        if self.tokens >= 1:\n            self.tokens -= 1\n            return True\n        return False";

// ============================================================================
// Phase generators
// ============================================================================

// Profilers (03/04) run in parallel for a given iteration.
async function* profilersPhase(
  runId: string,
  iteration: number,
): AsyncIterable<AgentEvent> {
  yield ev(runId, "human-profiler", "running", { iteration, message: `Profiling human (iteration ${iteration})` });
  yield ev(runId, "engine-profiler", "running", { iteration, message: `Profiling engine (iteration ${iteration})` });
  await delay(PARALLEL);
  yield ev(runId, "human-profiler", "done", { iteration, verdict: humanProfile(iteration), message: "Human profiled" });
  yield ev(runId, "engine-profiler", "done", { iteration, verdict: engineProfile(iteration), message: "Engine profiled" });
}

// The five checkers (08–12) run in parallel.
async function* checkersPhase(
  runId: string,
  clean: boolean,
): AsyncIterable<AgentEvent> {
  const checkers: AgentId[] = ["constraints", "antipatterns", "voice", "quality", "identity"];
  for (const c of checkers) {
    yield ev(runId, c, "running", { message: `Checking: ${c}` });
  }
  await delay(PARALLEL);

  const verdicts: Record<string, Verdict> = clean
    ? {
        constraints: { agent: "constraints", status: "clean", rule: null, excerpt: null, severity: null },
        antipatterns: { agent: "antipatterns", status: "clean", rule: null, excerpt: null, severity: null },
        voice: { agent: "voice", status: "clean", rule: null, excerpt: null, severity: null },
        quality: { agent: "quality", status: "clean", rule: null, excerpt: null, severity: null },
        identity: { agent: "identity", status: "consistent", reason: "Engine held its implementation-engineer stance throughout." },
      }
    : {
        constraints: { agent: "constraints", status: "clean", rule: null, excerpt: null, severity: null },
        antipatterns: {
          agent: "antipatterns",
          status: "violation",
          rule: "A05 — Unbounded retry loop",
          excerpt: "while True:\n    ...\n    retry()  # keep trying until it goes through",
          severity: "high",
        },
        voice: {
          agent: "voice",
          status: "violation",
          rule: "V02 — Hedging / low-confidence language",
          excerpt: "I think this might possibly work for your case",
          severity: "medium",
        },
        quality: { agent: "quality", status: "clean", rule: null, excerpt: null, severity: null },
        identity: { agent: "identity", status: "consistent", reason: "Engine stance consistent with implementation-engineer role." },
      };

  for (const c of checkers) {
    yield ev(runId, c, "done", { verdict: verdicts[c], message: `${c}: ${(verdicts[c] as { status: string }).status}` });
  }
}

// Everything after alignment succeeds: gap → checkers → (correction) → log → deliver.
async function* postAlignmentPhase(
  runId: string,
  clean: boolean,
): AsyncIterable<AgentEvent> {
  // 07 Gap analyzer
  yield ev(runId, "gap-analyzer", "running", { message: "Analyzing gap between ask and output" });
  await delay(STEP);
  yield ev(runId, "gap-analyzer", "done", {
    verdict: { agent: "gap-analyzer", status: "no-gap", gap: null },
    message: "No gap found",
  });

  // 08–12 checkers (parallel)
  yield* checkersPhase(runId, clean);

  // Coordinator correction step if any violation
  if (!clean) {
    yield ev(runId, "coordinator", "running", {
      message: "Violations found — coordinator correcting output…",
      correction: { status: "correcting", original: ORIGINAL_OUTPUT },
    });
    await delay(STEP * 2);
    yield ev(runId, "coordinator", "done", {
      message: "Output corrected",
      correction: { status: "corrected", original: ORIGINAL_OUTPUT, corrected: CORRECTED_OUTPUT },
    });
  } else {
    yield ev(runId, "coordinator", "done", {
      message: "All checks clean — delivering as-is",
      correction: { status: "none" },
    });
  }

  // 13 Harness logger
  yield ev(runId, "harness-logger", "running", { message: "Logging verdicts to harness" });
  await delay(STEP);
  yield ev(runId, "harness-logger", "done", {
    verdict: { agent: "human-logger", status: "logged", input: "(all verdicts persisted)", timestamp: now() } as Verdict,
    message: "Run logged to harness",
  });

  // Terminal: deliver
  yield ev(runId, "coordinator", "done", {
    message: clean ? "Delivered (clean)" : "Delivered (corrected)",
    finalOutput: clean ? ORIGINAL_OUTPUT.replace("I think this might possibly work for your case", "Here is a working implementation") : CORRECTED_OUTPUT,
  });
}

// ============================================================================
// Public mock entry points
// ============================================================================

export async function* simulateRun(input: RunInput): AsyncIterable<AgentEvent> {
  const runId = newRunId();
  const clean = isCleanScenario(input);

  // 14 Coordinator boots
  yield ev(runId, "coordinator", "running", { message: "Coordinator starting run", iteration: 1 });
  await delay(STEP);

  // 01 Human logger
  yield ev(runId, "human-logger", "running", { message: "Logging human input" });
  await delay(STEP);
  yield ev(runId, "human-logger", "done", {
    verdict: { agent: "human-logger", status: "logged", input: input.humanMessage, timestamp: now() },
    message: "Human input logged",
  });

  // 02 Thinking logger
  yield ev(runId, "thinking-logger", "running", { message: "Logging engine thinking" });
  await delay(STEP);
  yield ev(runId, "thinking-logger", "done", {
    verdict: { agent: "thinking-logger", status: "logged", thinking: input.engineThinking, timestamp: now() },
    message: "Engine thinking logged",
  });

  // 03/04 profilers (iteration 1)
  yield* profilersPhase(runId, 1);

  // 05 alignment checker
  yield ev(runId, "alignment-checker", "running", { iteration: 1, message: "Checking alignment" });
  await delay(STEP);

  if (clean) {
    yield ev(runId, "alignment-checker", "done", {
      iteration: 1,
      verdict: { agent: "alignment-checker", status: "aligned", reason: "Human ask and engine scope match." },
      message: "Aligned",
    });
    yield* postAlignmentPhase(runId, true);
    return;
  }

  // Misaligned → question generator → pause for human answer
  yield ev(runId, "alignment-checker", "done", {
    iteration: 1,
    verdict: {
      agent: "alignment-checker",
      status: "misaligned",
      reason: "Human wants production code; engine is producing a high-level explanation.",
    },
    message: "Misaligned — generating question",
  });

  yield ev(runId, "question-generator", "running", { iteration: 1, message: "Generating clarifying question" });
  await delay(STEP);
  yield ev(runId, "question-generator", "done", {
    iteration: 1,
    verdict: QUESTION,
    pendingQuestion: QUESTION,
    message: "Question ready — awaiting human answer",
  });

  // Pause: stash state keyed by runId. UI calls answerAlignmentQuestion to resume.
  pausedRuns.set(runId, { input, iteration: 1 });
}

export async function* simulateAnswer(
  runId: string,
  answer: string,
): AsyncIterable<AgentEvent> {
  const paused = pausedRuns.get(runId);
  if (!paused) {
    yield ev(runId, "coordinator", "done", { message: `No paused run for ${runId}` });
    return;
  }
  pausedRuns.delete(runId);
  const iteration = paused.iteration + 1;

  yield ev(runId, "coordinator", "running", {
    iteration,
    message: `Human answered: "${answer}" — re-running alignment (iteration ${iteration})`,
  });
  await delay(STEP);

  // Loop back to 03/04
  yield* profilersPhase(runId, iteration);

  // 05 alignment again → aligned
  yield ev(runId, "alignment-checker", "running", { iteration, message: "Re-checking alignment" });
  await delay(STEP);
  yield ev(runId, "alignment-checker", "done", {
    iteration,
    verdict: {
      agent: "alignment-checker",
      status: "aligned",
      reason: "After clarification, engine scope now matches the human's request for production code.",
    },
    message: "Aligned",
  });

  // Continue with the violation scenario downstream
  yield* postAlignmentPhase(runId, false);
}

// ============================================================================
// Mock harness history
// ============================================================================

function checker(
  agent: string,
  status: "clean" | "violation",
  rule: string | null = null,
  excerpt: string | null = null,
  severity: "high" | "medium" | "low" | null = null,
): HarnessEntry["constraints_verdict"] {
  return { agent, status, rule, excerpt, severity };
}

export const MOCK_HARNESS: HarnessEntry[] = [
  {
    entry_id: "h_0008",
    timestamp: "2026-06-18T09:42:11Z",
    human_input: "Write a token-bucket rate limiter for the payments API.",
    engine_thinking: "User likely wants production code, not theory. Provide a class.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:eng-01", role: "Backend engineer", scope: "Production rate limiter" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Implementation engineer", scope: "Token-bucket implementation" },
    alignment: { agent: "alignment-checker", status: "misaligned", reason: "Engine drifted to explanation; corrected after 1 loop." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "violation", "A05 — Unbounded retry loop", "while True: retry()", "high"),
    final_output: "class TokenBucket: ...",
  },
  {
    entry_id: "h_0007",
    timestamp: "2026-06-18T09:30:02Z",
    human_input: "Summarize the Q2 incident postmortem in two sentences.",
    engine_thinking: "Keep it terse and factual.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:pm-04", role: "Product manager", scope: "Concise summary" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Summarizer", scope: "Two-sentence summary" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "clean"),
    final_output: "The Q2 outage stemmed from a misconfigured failover. Mitigations shipped on June 12.",
  },
  {
    entry_id: "h_0006",
    timestamp: "2026-06-18T08:58:47Z",
    human_input: "Draft a friendly reminder email to the design team.",
    engine_thinking: "Tone should be warm but professional.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:ops-02", role: "Ops lead", scope: "Internal email" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Copywriter", scope: "Friendly email" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "violation", "V02 — Hedging language", "Maybe we could possibly meet?", "medium"),
    final_output: "Hi team — quick reminder that design specs are due Friday. Thanks!",
  },
  {
    entry_id: "h_0005",
    timestamp: "2026-06-17T17:21:09Z",
    human_input: "Explain why our latency spiked last night.",
    engine_thinking: "Provide root-cause reasoning with metrics.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:sre-03", role: "SRE", scope: "Root-cause analysis" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Analyst", scope: "Latency RCA" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "gap-found", gap: "Engine omitted the p99 metric the human asked about." },
    constraints_verdict: checker("constraints", "violation", "Q03 — No unanswered question", "p99 latency not addressed", "low"),
    antipatterns_verdict: checker("antipatterns", "clean"),
    final_output: "Latency rose due to a GC pause on node-7; p99 hit 1.8s. Added heap headroom.",
  },
  {
    entry_id: "h_0004",
    timestamp: "2026-06-17T14:03:55Z",
    human_input: "Refactor this function to be pure.",
    engine_thinking: "Remove side effects, return new value.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:eng-05", role: "Engineer", scope: "Refactor" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Implementation engineer", scope: "Pure refactor" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "clean"),
    final_output: "const total = (items) => items.reduce((a, b) => a + b.price, 0);",
  },
  {
    entry_id: "h_0003",
    timestamp: "2026-06-17T11:47:30Z",
    human_input: "Write marketing copy for the new dashboard.",
    engine_thinking: "Energetic, benefit-led copy.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:mkt-01", role: "Marketer", scope: "Landing copy" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Copywriter", scope: "Marketing copy" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "violation", "A11 — Overclaiming", "10x faster than anything ever built", "medium"),
    final_output: "See everything in one place. The dashboard that keeps your team in sync.",
  },
  {
    entry_id: "h_0002",
    timestamp: "2026-06-16T16:12:08Z",
    human_input: "Should we migrate to Postgres?",
    engine_thinking: "Weigh tradeoffs; the engine started role-playing as a CTO.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:eng-02", role: "Engineer", scope: "Tech decision input" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Decision-maker (drifted)", scope: "Acting as CTO" },
    alignment: { agent: "alignment-checker", status: "misaligned", reason: "Engine assumed authority to decide; human wanted analysis." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "clean"),
    final_output: "Here are the tradeoffs of migrating to Postgres — the decision is yours.",
  },
  {
    entry_id: "h_0001",
    timestamp: "2026-06-16T10:00:00Z",
    human_input: "Add input validation to the signup form.",
    engine_thinking: "Validate email + password length client and server side.",
    human_profile: { agent: "human-profiler", status: "profiled", id: "human:eng-06", role: "Frontend engineer", scope: "Form validation" },
    engine_profile: { agent: "engine-profiler", status: "profiled", id: "engine:assistant", role: "Implementation engineer", scope: "Validation logic" },
    alignment: { agent: "alignment-checker", status: "aligned", reason: "Scope matched." },
    gap: { agent: "gap-analyzer", status: "no-gap", gap: null },
    constraints_verdict: checker("constraints", "clean"),
    antipatterns_verdict: checker("antipatterns", "clean"),
    final_output: "Added zod schema validation on both client and server for email and password.",
  },
];
