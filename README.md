# Drift — Alignment Control Room

Real-time observability + control dashboard for **Drift**: 13 specialist AI agents + 1
coordinator that sit between a human and an AI engine, intercept every conversation turn,
and only release the engine's output once it passes the alignment pipeline.

Backend lives in `D:\git\hackathon-drift-agent` (Band remote agents · LangGraph · Claude
Sonnet 4.6). This app drives those agents and visualizes the run.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000  (MOCK mode — no backend needed)
```

## Mock vs Live

The whole decision lives in [lib/config.ts](lib/config.ts) and is driven by one env var.

| Mode | When | Behavior |
|------|------|----------|
| **MOCK** | `NEXT_PUBLIC_AGENT_API_BASE` unset | Fully simulated streaming pipeline (incl. a misalignment loop + a violation correction). Vercel/demo works with zero backend. |
| **LIVE** | `NEXT_PUBLIC_AGENT_API_BASE` set | Calls the real Band agent gateway. The nav shows a green **LIVE** pill. |

```bash
cp .env.example .env.local
# .env.local
NEXT_PUBLIC_AGENT_API_BASE=https://your-drift-gateway   # flips UI to live + shows host
AGENT_API_BASE=https://your-drift-gateway               # server-side proxy target
AGENT_API_KEY=...                                       # optional bearer for the gateway
```

## How the live wiring works

The frontend plays the **coordinator's** role and calls the 8 verdict-producing agents
over HTTP. The other agents (loggers, profilers, question generator, coordinator) are
orchestration-side and handled locally — exactly as the real coordinator does.

```
browser ──POST /api/agent/<slug>──► app/api/agent/[slug]/route.ts  (same-origin proxy)
                                          │  forwards server-side (no CORS, hides secret)
                                          ▼
                              <AGENT_API_BASE>/api/agent/<slug>     (Band gateway)
```

Endpoints called (see [lib/agents.ts](lib/agents.ts)):

| # | Agent | Endpoint |
|---|-------|----------|
| 05 | Alignment Classifier | `POST /api/agent/05-alignment-classifier` |
| 07 | Gap Analyzer | `POST /api/agent/07-gap-analyzer` |
| 08 | Constraints Checker | `POST /api/agent/08-constraints-checker` |
| 09 | Anti-patterns Checker | `POST /api/agent/09-anti-patterns-checker` |
| 10 | Voice Checker | `POST /api/agent/10-voice-checker` |
| 11 | Quality Checker | `POST /api/agent/11-quality-checker` |
| 12 | Identity Agent | `POST /api/agent/12-identity-agent` |
| 13 | Verifier | `POST /api/agent/13-verifier` |

**Pipeline:** log human + thinking → profile both → **05 alignment** (LIVE). If
misaligned, generate a question → human answers → loop back. Once aligned: **07 gap**
(LIVE) → **08–12 checkers in parallel** (LIVE) → coordinator corrects on any
`severity: "high"` verdict (per the backend's `coordinator/ROUTING.md`) → **13 verifier**
(LIVE) returns the final/corrected output and logs the harness record.

### Request / response contract

The proxy POSTs JSON with both a free-text `message` (what a Band agent natively consumes)
and structured context (`human_input`, `engine_thinking`, `engine_output`, `gap`,
`verdicts`). Responses are normalized by [lib/agentClient.ts](lib/agentClient.ts)
`extractVerdict()`, which accepts the verdict directly, wrapped (`{verdict}`, `{result}`,
`{output}`), or embedded in a Band/LangGraph message array — so it's resilient to the exact
gateway shape. Verdicts follow `shared/schema.json` from the backend (matched 1:1 in
[lib/types.ts](lib/types.ts)).

If the gateway is unreachable, the run surfaces a clear error banner (the coordinator never
fakes a verdict). Per-checker errors are treated as `clean` and logged — never block
delivery — mirroring the real coordinator.

## Screens

- **Run** (`/`) — submit a turn, watch all 14 agents animate in order/parallelism, click any
  node to inspect its verdict (endpoint, model, runtime shown). Alignment loop modal +
  correction diff + live event log.
- **Harness** (`/harness`) — searchable past turns + aggregate charts. (Served from the
  seeded harness; no gateway *read* endpoint exists yet — see `getHarness` in
  [lib/api.ts](lib/api.ts) to wire one.)
- **Agents** (`/agents`) — card per agent: job, endpoint/orchestration, model, runtime.

## Architecture

```
app/
  api/agent/[slug]/route.ts   same-origin proxy → Band gateway
  page.tsx / harness / agents views
components/                   presentational + interactive (no data imports)
lib/
  types.ts        domain contracts (mirror shared/schema.json)
  agents.ts       static 14-agent config + real endpoints/model/runtime
  config.ts       USE_MOCK + gateway base (the swap point)
  agentClient.ts  HTTP client + robust verdict extraction
  liveRun.ts      LIVE orchestration (coordinator role)
  mock.ts         simulated streaming run + seed harness
  api.ts          single data-layer seam used by the UI
  store.ts        Zustand store: AgentEvent stream → UI state
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer Motion · Zustand ·
WebGL shader background. Dark control-room theme; pass/fail shown with icon + label + color.
