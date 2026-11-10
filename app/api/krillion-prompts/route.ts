import { NextResponse } from "next/server";
import { checkIngestAuth } from "@/lib/auth";
import { savePrompts } from "@/lib/ingest";

export const dynamic = "force-dynamic";

// POST { puzzle: 118, prompts: [{ slot: 1, prompt: "...", topic: "Geography" }, ...] }
export async function POST(req: Request) {
  if (!checkIngestAuth(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as any;
  if (!body || !Number.isInteger(body.puzzle) || !Array.isArray(body.prompts)) {
    return NextResponse.json({ error: "expected { puzzle, prompts: [{ slot, prompt, topic }] }" }, { status: 400 });
  }
  return NextResponse.json(await savePrompts(body.puzzle, body.prompts));
}
