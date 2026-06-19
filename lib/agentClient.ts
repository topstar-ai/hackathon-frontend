import { AGENT_PROXY_BASE } from "./config";

// ============================================================================
// Thin HTTP client for the Drift agent gateway. Each specialist agent is a
// Band remote agent; the gateway exposes the verdict-producing ones at
// POST /api/agent/<slug>. We post through the same-origin proxy.
//
// Because the gateway forwards to a Band agent that returns plain-text JSON,
// responses come back in several possible shapes. extractVerdict() normalizes
// them into a plain object so the rest of the app sees one contract.
// ============================================================================

export interface AgentCallBody {
  // free-text message (what a Band agent natively consumes)
  message?: string;
  // structured context — the gateway/agent picks what it needs
  human_input?: string;
  engine_thinking?: string;
  engine_output?: string;
  gap?: string | null;
  human_profile?: unknown;
  engine_profile?: unknown;
  verdicts?: unknown[];
  // alignment loop: the human's answer to the generated question
  answer?: string;
  [k: string]: unknown;
}

const TIMEOUT_MS = 45_000;

export async function callAgent<T = Record<string, unknown>>(
  slug: string,
  body: AgentCallBody,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${AGENT_PROXY_BASE}/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = JSON.stringify(await res.json());
      } catch {
        detail = await res.text().catch(() => "");
      }
      throw new Error(`Agent ${slug} → HTTP ${res.status} ${detail}`.trim());
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// Find the first object containing an `agent`/`status` verdict somewhere in a
// possibly-wrapped response (Band send_message, LangGraph messages, etc.).
export function extractVerdict<T = Record<string, unknown>>(
  raw: unknown,
): T | null {
  if (raw == null) return null;

  // string → try to parse embedded JSON
  if (typeof raw === "string") {
    const parsed = tryParseJson(raw);
    return parsed ? extractVerdict<T>(parsed) : null;
  }

  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // direct verdict
  if (typeof obj.status === "string" && ("agent" in obj || "rule" in obj || "reason" in obj || "gap" in obj || "question" in obj || "output" in obj)) {
    return obj as T;
  }

  // common wrappers
  for (const key of ["verdict", "result", "data", "response", "output", "content"]) {
    if (key in obj) {
      const found = extractVerdict<T>(obj[key]);
      if (found) return found;
    }
  }

  // LangGraph/Band message arrays
  const messages = (obj.messages ?? obj.events) as unknown;
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i] as Record<string, unknown>;
      const text = (m?.content ?? m?.text ?? m?.body) as unknown;
      const found = extractVerdict<T>(text);
      if (found) return found;
    }
  }

  // last resort: the object itself if it at least has a status
  if (typeof obj.status === "string") return obj as T;
  return null;
}

function tryParseJson(s: string): unknown {
  // strip code fences / surrounding prose, grab the outermost JSON object
  const trimmed = s.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
