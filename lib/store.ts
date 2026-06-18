"use client";

import { create } from "zustand";
import type {
  AgentEvent,
  AgentId,
  AgentState,
  Question,
  RunInput,
  Verdict,
} from "./types";
import { AGENTS } from "./agents";
import { answerAlignmentQuestion, runPipeline } from "./api";

// ============================================================================
// Run store — consumes the AgentEvent stream from lib/api and projects it into
// per-agent UI state. The store is transport-agnostic: it doesn't know or care
// whether events came from the mock or the real Band backend.
// ============================================================================

export interface AgentNodeState {
  state: AgentState;
  verdict?: Verdict;
  iteration: number;
  updatedAt?: string;
}

export interface LogLine {
  id: number;
  agentId: AgentId;
  state: AgentState;
  message: string;
  iteration?: number;
  timestamp: string;
}

export interface CorrectionState {
  status: "correcting" | "corrected" | "none";
  original?: string;
  corrected?: string;
}

export type RunStatus = "idle" | "running" | "awaiting-answer" | "done" | "error";

interface RunStore {
  runId: string | null;
  status: RunStatus;
  nodes: Record<AgentId, AgentNodeState>;
  log: LogLine[];
  iteration: number;
  pendingQuestion: Question | null;
  correction: CorrectionState | null;
  finalOutput: string | null;
  originalProposed: string | null;
  selectedAgent: AgentId | null;
  error: string | null;

  reset: () => void;
  selectAgent: (id: AgentId | null) => void;
  start: (input: RunInput) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
}

function freshNodes(): Record<AgentId, AgentNodeState> {
  return AGENTS.reduce(
    (acc, a) => {
      acc[a.id] = { state: "idle", iteration: 1 };
      return acc;
    },
    {} as Record<AgentId, AgentNodeState>,
  );
}

let logCounter = 0;

export const useRunStore = create<RunStore>((set, get) => {
  // Apply a single streamed event to the store.
  function apply(e: AgentEvent) {
    set((s) => {
      const nodes = { ...s.nodes };
      nodes[e.agentId] = {
        state: e.state,
        verdict: e.verdict ?? nodes[e.agentId]?.verdict,
        iteration: e.iteration ?? nodes[e.agentId]?.iteration ?? 1,
        updatedAt: e.timestamp,
      };

      const log = e.message
        ? [
            ...s.log,
            {
              id: logCounter++,
              agentId: e.agentId,
              state: e.state,
              message: e.message,
              iteration: e.iteration,
              timestamp: e.timestamp,
            },
          ]
        : s.log;

      return {
        nodes,
        log,
        runId: e.runId ?? s.runId,
        iteration: e.iteration ?? s.iteration,
        pendingQuestion: e.pendingQuestion ?? s.pendingQuestion,
        correction: e.correction ?? s.correction,
        finalOutput: e.finalOutput ?? s.finalOutput,
      };
    });
  }

  async function consume(stream: AsyncIterable<AgentEvent>) {
    try {
      for await (const e of stream) {
        apply(e);
        if (e.pendingQuestion) {
          set({ status: "awaiting-answer" });
        }
      }
      // If we ended without a pending question, the run is complete.
      if (get().status !== "awaiting-answer") {
        set({ status: "done" });
      }
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : String(err) });
    }
  }

  return {
    runId: null,
    status: "idle",
    nodes: freshNodes(),
    log: [],
    iteration: 1,
    pendingQuestion: null,
    correction: null,
    finalOutput: null,
    originalProposed: null,
    selectedAgent: null,
    error: null,

    reset: () =>
      set({
        runId: null,
        status: "idle",
        nodes: freshNodes(),
        log: [],
        iteration: 1,
        pendingQuestion: null,
        correction: null,
        finalOutput: null,
        originalProposed: null,
        selectedAgent: null,
        error: null,
      }),

    selectAgent: (id) => set({ selectedAgent: id }),

    start: async (input) => {
      get().reset();
      set({ status: "running", originalProposed: input.proposedOutput });
      await consume(runPipeline(input));
    },

    submitAnswer: async (answer) => {
      const runId = get().runId;
      if (!runId) return;
      set({ status: "running", pendingQuestion: null });
      await consume(answerAlignmentQuestion(runId, answer));
    },
  };
});
