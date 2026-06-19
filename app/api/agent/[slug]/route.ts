import { NextRequest, NextResponse } from "next/server";
import { serverGatewayBase } from "@/lib/config";
import { ENDPOINT_TO_AGENT } from "@/lib/agents";

// ============================================================================
// Same-origin proxy → Drift agent gateway. The browser POSTs to
// /api/agent/<slug>; we forward server-side to <GATEWAY>/api/agent/<slug>.
// Keeps the gateway URL/secret off the client and sidesteps CORS.
//
// Configure with env (no NEXT_PUBLIC needed for the secret path):
//   AGENT_API_BASE=https://your-drift-gateway
//   AGENT_API_KEY=...           (optional, sent as Authorization: Bearer)
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(Object.keys(ENDPOINT_TO_AGENT));

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  if (!ALLOWED.has(slug)) {
    return NextResponse.json(
      { error: `Unknown agent endpoint: ${slug}` },
      { status: 404 },
    );
  }

  const base = serverGatewayBase();
  if (!base) {
    // No backend configured — tell the client to use mock.
    return NextResponse.json(
      { error: "no_backend", detail: "AGENT_API_BASE is not set." },
      { status: 503 },
    );
  }

  const body = await req.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.AGENT_API_KEY) {
    headers["Authorization"] = `Bearer ${process.env.AGENT_API_KEY}`;
  }

  try {
    const upstream = await fetch(`${base}/api/agent/${slug}`, {
      method: "POST",
      headers,
      body,
    });
    const text = await upstream.text();
    // pass through status + body (JSON if possible)
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "gateway_unreachable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
