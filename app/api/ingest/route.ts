import { NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/auth";
import { ingest, lastIngest, type SlackMessage } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// GET: when did the last import run, and what was the newest Slack message it saw?
// The daily job uses latest_ts as the "oldest" bound for the next Slack read.
export async function GET(req: Request) {
  if (!checkIngestAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ last: await lastIngest() });
}

// POST { messages: [{ ts, user, user_name, text }] }
export async function POST(req: Request) {
  if (!checkIngestAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { messages?: SlackMessage[] } | null;
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "expected { messages: [...] }" }, { status: 400 });
  }
  return NextResponse.json(await ingest(body.messages));
}
