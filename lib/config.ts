// ============================================================================
// Runtime configuration. The whole mock-vs-live decision lives here.
//
//   - Set NEXT_PUBLIC_AGENT_API_BASE to your Drift agent gateway to go LIVE.
//     Example: NEXT_PUBLIC_AGENT_API_BASE=https://drift-gateway.fly.dev
//   - Leave it unset and the app runs entirely on the simulated mock pipeline
//     (so the public demo + Vercel build work with zero backend).
//
// Browser requests go to the same-origin proxy (app/api/agent/[slug]) which
// forwards server-side to the gateway — this avoids CORS and keeps the gateway
// URL/secret server-side. The proxy reads AGENT_API_BASE (server) and falls
// back to NEXT_PUBLIC_AGENT_API_BASE.
// ============================================================================

// Public base — readable in the browser, used only to decide live vs mock.
export const PUBLIC_AGENT_API_BASE =
  process.env.NEXT_PUBLIC_AGENT_API_BASE?.replace(/\/+$/, "") ?? "";

// When a gateway is configured we drive the real agents; otherwise mock.
export const USE_MOCK = PUBLIC_AGENT_API_BASE.length === 0;

export const CONNECTION_MODE: "live" | "mock" = USE_MOCK ? "mock" : "live";

// Same-origin path the browser calls; proxied to the gateway server-side.
export const AGENT_PROXY_BASE = "/api/agent";

// Server-side resolved gateway base (used inside the proxy route handler).
export function serverGatewayBase(): string {
  const base =
    process.env.AGENT_API_BASE ?? process.env.NEXT_PUBLIC_AGENT_API_BASE ?? "";
  return base.replace(/\/+$/, "");
}
